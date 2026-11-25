import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireScheduleApiSession(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ success: false, error: "印刷IDが不正です" }, { status: 400 })
  }
  const rawBody: unknown = await request.json().catch(() => null)
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ success: false, error: "入力内容が不正です" }, { status: 400 })
  }
  const body = rawBody as Record<string, unknown>
  const supabase = auth.session.client

  const allowedFields = [
    "dtp_completed",
    "paper_stacked",
    "plate_completed",
    "pp_processed",
    "printing_completed",
    "has_special_color",
  ]

  const updateData: Record<string, boolean> = {}

  const fields = Object.keys(body)
  if (fields.length === 0 || fields.some(field => !allowedFields.includes(field) || typeof body[field] !== "boolean")) {
    return NextResponse.json({ success: false, error: "進捗項目には true または false を指定してください" }, { status: 400 })
  }
  for (const field of fields) {
    updateData[field] = body[field] as boolean
  }

  const { data: existing, error: existingError } = await supabase
    .from("print_item_details")
    .select("id")
    .eq("print_item_id", id)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ success: false, error: "印刷明細の取得に失敗しました" }, { status: 500 })
  }

  const result = existing
    ? await supabase
        .from("print_item_details")
        .update(updateData)
        .eq("print_item_id", id)
        .select()
        .single()
    : await supabase
        .from("print_item_details")
        .insert({
          print_item_id: id,
          ...updateData,
        })
        .select()
        .single()

  if (result.error) {
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  })
}