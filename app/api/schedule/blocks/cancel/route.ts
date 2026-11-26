import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

export async function PATCH(request: NextRequest) {
  const auth = await requireScheduleApiSession(request)
  if (!auth.ok) return auth.response
  const body = await request.json()
  const blockIds = Array.isArray(body.blockIds) ? body.blockIds : []

  if (blockIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "削除対象が選択されていません" },
      { status: 400 }
    )
  }

  const supabase = auth.session.client

  const { data, error } = await supabase
    .from("schedule_blocks")
    .update({
      status: "canceled",
      scheduled_date: null,
      machine_id: null,
      shift_category: null,
      sequence_no: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", blockIds)
    .eq("status", "unassigned")
    .select()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data,
    count: data?.length ?? 0,
  })
}