import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

export const dynamic = "force-dynamic"

const SEARCH_FIELDS = [
  "order_number",
  "product_name",
  "customer_name",
  "part_name",
  "unit_name",
  "plate_size",
] as const

const RESULT_LIMIT = 80

export async function GET(request: NextRequest) {
  const auth = await requireScheduleApiSession(request)
  if (!auth.ok) return auth.response
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  const scope = request.nextUrl.searchParams.get("scope") ?? "all"

  if (!["all", "assigned", "unassigned"].includes(scope)) {
    return NextResponse.json({ error: "検索対象が不正です" }, { status: 400 })
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "検索文字数は80文字以内にしてください" }, { status: 400 })
  }
  if (q.length < 2) {
    return NextResponse.json({ results: [], hasMore: false }, {
      headers: { "Cache-Control": "no-store" },
    })
  }

  // PostgRESTのorフィルターの構文記号とILIKEワイルドカードは検索語に含めない
  const safe = q.replace(/[(),.%_*"\\]/g, " ").replace(/\s+/g, " ").trim()
  if (safe.length < 2) {
    return NextResponse.json({ results: [], hasMore: false }, {
      headers: { "Cache-Control": "no-store" },
    })
  }

  try {
    const supabase = auth.session.client
    const filter = SEARCH_FIELDS.map((field) => `${field}.ilike.*${safe}*`).join(",")

    let query = supabase
      .from("vw_schedule_blocks_with_details")
      .select(
        "block_id,order_number,product_name,customer_name,part_name,unit_name,plate_size,scheduled_date,machine_id,machine_name,shift_category,block_status",
      )
      .or(filter)

    if (scope === "unassigned") query = query.eq("block_status", "unassigned")
    if (scope === "assigned") query = query.neq("block_status", "unassigned")

    const { data, error } = await query
      .order("block_updated_at", { ascending: false })
      .limit(RESULT_LIMIT + 1)

    if (error) {
      console.error("全案件検索に失敗:", error.message)
      return NextResponse.json({ error: "検索に失敗しました" }, { status: 500 })
    }

    const rows = data ?? []
    return NextResponse.json(
      { results: rows.slice(0, RESULT_LIMIT), hasMore: rows.length > RESULT_LIMIT },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("全案件検索APIエラー:", error)
    return NextResponse.json({ error: "検索に失敗しました" }, { status: 500 })
  }
}
