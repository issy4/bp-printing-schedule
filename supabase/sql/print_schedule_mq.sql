-- 印刷スケジュール MQ（親印刷指示/手入力印刷明細単位）
-- ERP Supabase の SQL Editor で適用する。Windows SQL Server には適用しない。
-- 初回の本番適用前に対象プロジェクト/既存RLSの確認を推奨。
BEGIN;

CREATE TABLE IF NOT EXISTS public.print_schedule_mq (
  mq_key text PRIMARY KEY
    CHECK (mq_key ~ '^(legacy:[0-9]+|item:[0-9a-fA-F-]{36})$'),
  source_amount bigint NULL
    CHECK (source_amount IS NULL OR source_amount BETWEEN 0 AND 999999999999),
  source_status text NOT NULL DEFAULT 'missing'
    CHECK (source_status IN ('unique', 'missing', 'ambiguous')),
  source_detail_id bigint NULL,
  source_synced_at timestamptz NULL,
  manual_amount bigint NULL
    CHECK (manual_amount IS NULL OR manual_amount BETWEEN 0 AND 999999999999),
  manual_updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  manual_updated_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.print_schedule_mq IS
  '基幹の親印刷ID単位のMQ。手動MQは同期処理に変更させず、常に手動値を優先する。';

ALTER TABLE public.print_schedule_mq ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.print_schedule_mq FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.print_schedule_mq TO authenticated;

DROP POLICY IF EXISTS "schedule MQ ERP read" ON public.print_schedule_mq;
CREATE POLICY "schedule MQ ERP read"
  ON public.print_schedule_mq FOR SELECT TO authenticated
  USING (COALESCE(public.check_printing_schedule_access(), false));

-- print_units.unit_no は基幹の1台目判定には使えない。
-- 基幹の子印刷明細には各1台ずつ作られるため、
-- 同じ legacy_parent_id の子明細を legacy_job_no 順に並べた先頭をMQ表示対象にする。
-- アプリで新規作成した明細は当該 print_item の unit_no=1 のみをMQ対象にする。
CREATE OR REPLACE VIEW public.vw_schedule_unit_mq
WITH (security_invoker = true)
AS
WITH ranked_units AS (
  SELECT
    pu.id AS print_unit_id,
    CASE
      WHEN pi.legacy_parent_id IS NOT NULL THEN 'legacy:' || pi.legacy_parent_id::text
      ELSE 'item:' || pi.id::text
    END AS mq_key,
    ROW_NUMBER() OVER (
      PARTITION BY
        CASE
          WHEN pi.legacy_parent_id IS NOT NULL THEN 'legacy:' || pi.legacy_parent_id::text
          ELSE 'item:' || pi.id::text
        END
      ORDER BY pi.legacy_job_no NULLS LAST, pi.id, pu.unit_no, pu.id
    ) AS row_rank
  FROM public.print_units pu
  JOIN public.print_items pi ON pi.id = pu.print_item_id
)
SELECT
  ranked_units.print_unit_id,
  ranked_units.mq_key,
  (ranked_units.row_rank = 1) AS mq_is_first,
  CASE WHEN ranked_units.row_rank = 1
    THEN COALESCE(m.manual_amount, m.source_amount)
    ELSE NULL
  END AS mq_amount,
  CASE
    WHEN ranked_units.row_rank <> 1 THEN 'not_first'
    WHEN m.manual_amount IS NOT NULL THEN 'manual'
    WHEN m.source_amount IS NOT NULL THEN 'source'
    ELSE 'missing'
  END AS mq_origin
FROM ranked_units
LEFT JOIN public.print_schedule_mq m ON m.mq_key = ranked_units.mq_key;

REVOKE ALL ON public.vw_schedule_unit_mq FROM PUBLIC, anon;
GRANT SELECT ON public.vw_schedule_unit_mq TO authenticated;

-- 書込はこのRPCのみ。基幹由来の source_amount は認証クライアントから編集させない。
CREATE OR REPLACE FUNCTION public.set_schedule_mq_manual(
  p_mq_key text,
  p_amount bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result public.print_schedule_mq%ROWTYPE;
  v_exists boolean;
BEGIN
  IF auth.uid() IS NULL
     OR NOT COALESCE(public.check_printing_schedule_access(), false) THEN
    RAISE EXCEPTION 'ERP印刷スケジュールの利用権限がありません'
      USING ERRCODE = '42501';
  END IF;

  IF p_mq_key IS NULL
     OR p_mq_key !~ '^(legacy:[0-9]+|item:[0-9a-fA-F-]{36})$' THEN
    RAISE EXCEPTION 'MQ対象キーが不正です' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NOT NULL AND (p_amount < 0 OR p_amount > 999999999999) THEN
    RAISE EXCEPTION 'MQは0～999999999999の整数で入力してください'
      USING ERRCODE = '22023';
  END IF;

  IF p_mq_key LIKE 'legacy:%' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.print_items pi
      WHERE pi.legacy_parent_id = substring(p_mq_key FROM 8)::bigint
    ) INTO v_exists;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.print_items pi
      WHERE pi.id = substring(p_mq_key FROM 6)::uuid
        AND pi.legacy_parent_id IS NULL
    ) INTO v_exists;
  END IF;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'MQの対象となる印刷指示が存在しません'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.print_schedule_mq (
    mq_key, manual_amount, manual_updated_by, manual_updated_at, updated_at
  ) VALUES (
    p_mq_key, p_amount, auth.uid(), now(), now()
  )
  ON CONFLICT (mq_key) DO UPDATE
    SET manual_amount = EXCLUDED.manual_amount,
        manual_updated_by = EXCLUDED.manual_updated_by,
        manual_updated_at = EXCLUDED.manual_updated_at,
        updated_at = now()
  RETURNING * INTO v_result;

  RETURN jsonb_build_object(
    'mq_key', v_result.mq_key,
    'amount', COALESCE(v_result.manual_amount, v_result.source_amount),
    'origin', CASE
      WHEN v_result.manual_amount IS NOT NULL THEN 'manual'
      WHEN v_result.source_amount IS NOT NULL THEN 'source'
      ELSE 'missing'
    END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.set_schedule_mq_manual(text,bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_schedule_mq_manual(text,bigint)
  TO authenticated;

COMMIT;

-- 確認用（適用後に別実行）
-- SELECT mq_key, source_amount, manual_amount FROM public.print_schedule_mq LIMIT 10;
-- SELECT print_unit_id, mq_key, mq_is_first, mq_amount, mq_origin
-- FROM public.vw_schedule_unit_mq LIMIT 10;
