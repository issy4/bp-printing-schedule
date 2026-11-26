// Windowsの C:\\sync\\sqlserver-to-supabase にコピーして実行する。
// 既存 .env.new と mssql / dotenv / @supabase/supabase-js を使用。
// 必ず print-pipeline（印刷指示同期→予定表取込）の後に実行する。
require("dotenv").config({ path: "./.env.new" })
const sql = require("mssql")
const { createClient } = require("@supabase/supabase-js")

const MAX_MQ = 999999999999
const BATCH_SIZE = 100
const APPLY = process.argv.includes("--apply")
const EXPECTED_PROJECT = "pkwajxeegidydalcannz"
if (process.argv.slice(2).some(arg => arg !== "--apply" && arg !== "--dry-run") ||
    (APPLY && process.argv.includes("--dry-run"))) {
  throw new Error("引数は --dry-run または --apply のどちらかを指定してください")
}

const query = `
WITH parents AS (
  SELECT
    pr.id AS parent_id,
    pr.parts,
    o.project_id,
    o.id AS order_id,
    o.lower_version,
    COUNT(*) OVER (PARTITION BY o.project_id, pr.parts) AS same_part_parent_count
  FROM dbo.t_prints pr
  INNER JOIN dbo.t_orders o ON o.id = pr.order_id
  WHERE pr.parent_id IS NULL
),
matched AS (
  SELECT
    p.parent_id,
    p.same_part_parent_count,
    COUNT(DISTINCT e.id) AS adopted_estimate_count,
    COUNT(DISTINCT d.id) AS matched_detail_count,
    MAX(d.id) AS detail_id,
    MAX(CAST(d.quantity * d.unit_price AS DECIMAL(28,4))) AS amount
  FROM parents p
  LEFT JOIN dbo.t_estimates e
    ON e.project_id = p.project_id
   AND e.order_flg = 1
  LEFT JOIN dbo.t_estimate_details d
    ON d.estimate_id = e.id
   AND d.major_item = 68
   AND d.medium_item = p.parts
  WHERE p.lower_version >= DATEADD(DAY, -14, CONVERT(date, GETDATE()))
    AND p.lower_version < DATEADD(DAY, 91, CONVERT(date, GETDATE()))
  GROUP BY p.parent_id, p.same_part_parent_count
)
SELECT
  parent_id,
  CASE
    WHEN same_part_parent_count = 1
     AND adopted_estimate_count = 1
     AND matched_detail_count = 1
     AND amount >= 0
     AND amount <= ${MAX_MQ}
     AND amount = FLOOR(amount)
    THEN CAST(amount AS BIGINT) ELSE NULL
  END AS source_amount,
  CASE
    WHEN same_part_parent_count <> 1
      OR adopted_estimate_count > 1
      OR matched_detail_count > 1
      OR (matched_detail_count = 1 AND
          (amount < 0 OR amount > ${MAX_MQ} OR amount <> FLOOR(amount)))
    THEN 'ambiguous'
    ELSE CASE WHEN matched_detail_count = 1
              AND adopted_estimate_count = 1
              AND amount IS NOT NULL
              THEN 'unique' ELSE 'missing' END
  END AS source_status,
  CASE WHEN same_part_parent_count = 1
              AND adopted_estimate_count = 1
              AND matched_detail_count = 1
              AND amount >= 0
              AND amount <= ${MAX_MQ}
              AND amount = FLOOR(amount)
       THEN detail_id ELSE NULL END AS source_detail_id
FROM matched
ORDER BY parent_id;
`

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.SQLSERVER_HOST || !process.env.SQLSERVER_DATABASE ||
      !process.env.SQLSERVER_USER || !process.env.SQLSERVER_PASSWORD) {
    throw new Error(".env.new のSQL Server / Supabase設定が不足しています")
  }

  const target = new URL(process.env.SUPABASE_URL)
  if (target.protocol !== "https:" || target.hostname !== EXPECTED_PROJECT + ".supabase.co") {
    throw new Error("ERP本番Supabaseと接続先が一致しないため中断します")
  }
  console.log("[MQ] モード: " + (APPLY ? "APPLY（MQ書込）" : "DRY-RUN（参照のみ）"))
  console.log("[MQ] 対象プロジェクト: " + EXPECTED_PROJECT)

  const db = new sql.ConnectionPool({
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    server: process.env.SQLSERVER_HOST,
    port: Number(process.env.SQLSERVER_PORT || 1433),
    database: process.env.SQLSERVER_DATABASE,
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 30000,
    requestTimeout: 120000,
  })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  try {
    await db.connect()
    const results = (await db.request().query(query)).recordset
    if (results.length === 0) {
      console.log("[MQ] 対象なし。更新をスキップします。")
      return
    }

    const counters = { unique: 0, missing: 0, ambiguous: 0 }
    const rows = results.map((r) => {
      const source_amount = r.source_amount == null ? null : Number(r.source_amount)
      const source_status = r.source_status === "unique" && source_amount != null &&
        Number.isSafeInteger(source_amount) && source_amount >= 0 &&
        source_amount <= MAX_MQ ? "unique" :
        r.source_status === "unique" ? "ambiguous" : r.source_status
      counters[source_status] += 1
      return {
        mq_key: "legacy:" + String(r.parent_id),
        source_amount: source_status === "unique" ? source_amount : null,
        source_status,
        source_detail_id: source_status === "unique" ? Number(r.source_detail_id) : null,
      }
    })

    console.log(`[MQ] 対象: 全${rows.length}件 自動${counters.unique}件 未一致${counters.missing}件 要手入力${counters.ambiguous}件`)
    for (const key of ["legacy:242706", "legacy:242708", "legacy:242710", "legacy:244917"]) {
      const r = rows.find(row => row.mq_key === key)
      console.log("[MQ] 確認対象", key, r ? r.source_status + " amount=" + String(r.source_amount) : "対象期間外または対象なし")
    }
    if (!APPLY) {
      console.log("[MQ] DRY-RUN完了: Supabaseへの書込なし")
      return
    }

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const { data, error } = await supabase.rpc("upsert_schedule_mq_sources", {
        p_rows: batch,
      })
      if (error) throw new Error("MQ書込エラー: " + error.message)
      console.log(`[MQ] ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}件 取込（RPC件数=${data}）`)
    }
    console.log(`[MQ] 完了: 全${rows.length}件 自動${counters.unique}件 未一致${counters.missing}件 要手入力${counters.ambiguous}件`)
  } finally {
    await db.close()
  }
}

main().catch((error) => {
  console.error("[MQ] ERROR", error)
  process.exitCode = 1
})
