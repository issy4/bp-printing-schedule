import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireScheduleApiSession(request)
  if (!auth.ok) return auth.response
  const { id } = await params
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