# 印刷スケジュール MQ機能（導入手順）

## 仕様
- 基幹からの初期MQは、採用見積が1件、印刷工程（major_item=68）・部品（medium_item=t_prints.parts）の見積明細が1件、同一受注・部品の親印刷指示が1件、金額が0以上の整数の場合だけ取得。
- 金額未一致・明細複数・親重複は自動MQをNULLとし、1台目に手入力する。
- 基幹の子印刷明細の台数分、MQを繰り返し加算しない。legacy_parent_idごとにlegacy_job_noの先頭1件だけ表示・集計。
- 日別TOTAL MQは全印刷機・日勤・夜勤を対象とし、フィルタに左右されない。同じMQキーが複数の予定ブロックを持つ場合も、週内で1回だけ集計する。
- 本番のschedule_blocks/print_items/print_unitsの構造と既存の取込関数は変更しない。
- 自動MQ(source_amount)と手入力MQ(manual_amount)は独立。手入力があれば優先し、基幹同期は手入力額を更新しない。入力を空にして保存すると手入力を解除し、基幹の金額がある場合はそれに戻る。

## 必要な導入作業

1. **ERP本番Supabaseプロジェクトを確認する**（過去に確認したID: `pkwajxeegidydalcannz`）。他のSupabaseプロジェクトには実行しない。
2. SQL Editorで `supabase/sql/print_schedule_mq.sql` 全文を実行。テーブル・ビュー・2つの認証付きRPCを追加。実行前にDBバックアップまたは復旧手段を確認する。
3. 次の参照用SQLでテーブル・ビュー・RPCを確認:

```sql
SELECT to_regclass('public.print_schedule_mq') AS mq_table,
       to_regclass('public.vw_schedule_unit_mq') AS mq_view,
       to_regprocedure('public.set_schedule_mq_manual(text,bigint)') AS manual_rpc,
       to_regprocedure('public.upsert_schedule_mq_sources(jsonb)') AS source_rpc;
SELECT mq_key, COUNT(*) AS unit_count,
       COUNT(*) FILTER (WHERE mq_is_first) AS first_count
FROM public.vw_schedule_unit_mq
WHERE mq_key='legacy:242706'
GROUP BY mq_key;
```

4. GitHubのMQ機能ブランチをPreviewで確認し、SQL適用後に本番へデプロイ（PRのマージ）。画面だけ先に更新した場合はMQが表示されない。
5. リポジトリの `scripts/sync-print-mq-from-sqlserver.cjs` を Windowsの `C:\\sync\\sqlserver-to-supabase\\sync-print-mq-from-sqlserver.cjs` にコピー。
   - 既存 `.env.new` と `mssql`, `dotenv`, `@supabase/supabase-js` のインストールを利用。
   - SQL Server側はSELECTのみ。参照先はERPのSQL Server/Supabase構成。
6. **手動で一度実行して取込結果を確認**:

```powershell
cd C:\sync\sqlserver-to-supabase
node .\sync-print-mq-from-sqlserver.cjs
```

想定結果（対象期間が同じ場合）: 388件の親印刷指示のうち、少なくとも316件が自動MQ候補。対象期間中に追加更新があれば件数は変わる。明細複数の103947部品168は自動取込せず手入力。

7. SQL Editorで基幹取込の確認:

```sql
SELECT mq_key, source_amount, source_status, manual_amount,
       COALESCE(manual_amount, source_amount) AS effective_mq
FROM public.print_schedule_mq
WHERE mq_key IN ('legacy:242706','legacy:242708','legacy:242710','legacy:244917')
ORDER BY mq_key;
```

期待値: 242706=44000、242708=20000、242710=8000。244917はNULL（複数見積明細）。

8. 画面でMQの入力・保存、1台目以外の非表示、ドラッグ移動後のTOTAL MQ、手入力後の基幹再同期（手入力値維持）を確認。

## Windowsタスクスケジューラとの統合

既存 `SQLServer_to_Supabase_AllSync` の `run-all-sync.bat` は **手動検証後** に変更。
すでに `sync-prints-new.js` を `run-print-pipeline.cmd` へ置換した場合、その直後、請求同期の前に次を追加する。

```bat
echo [%date% %time%] sync-print-mq start >> "%LOGFILE%"
node sync-print-mq-from-sqlserver.cjs >> "%LOGFILE%" 2>&1
if errorlevel 1 (
    echo [%date% %time%] sync-print-mq ERROR (invoices continue) >> "%LOGFILE%"
) else (
    echo [%date% %time%] sync-print-mq end >> "%LOGFILE%"
)
```

MQ取込だけの障害で請求・請求明細の同期が止まらないようにする。
異なるSupabaseプロジェクト向けの `SQLServer to Supabase Sync` タスクには触れない。

## 実装対象
- `supabase/sql/print_schedule_mq.sql`: 本番DBへの追加SQL（手作業適用）
- `scripts/sync-print-mq-from-sqlserver.cjs`: 基幹MQの安全な自動取込
- `lib/schedule/get-weekly-calendar-data.ts`: MQの読込
- `app/api/schedule/mq/route.ts`: ERP認証付きの手入力保存
- `components/schedule/WeeklyScheduleBoard.tsx`: MQ欄・日別合計
- `types/schedule.ts`: データ型

**注意:** 今回のPRだけで本番DBのSQLが自動適用されることはない。DBアクセス権がない場合はSQL Editorでの実行結果を確認してから運用する。
