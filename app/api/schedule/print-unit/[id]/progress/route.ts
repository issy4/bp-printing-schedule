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

  if (Object.keys(body).length !== 1 || typeof body.printing_completed !== "boolean") {
    return NextResponse.json({ success: false, error: "刷了には true または false を指定してください" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("print_units")
    .update({
      printing_completed: body.printing_completed,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data,
  })
}