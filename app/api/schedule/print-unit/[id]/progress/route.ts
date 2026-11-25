import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireScheduleApiSession(request)
  if (!auth.ok) return auth.response
  const { id } = await params
  const body = await request.json()
  const supabase = auth.session.client

  const { data, error } = await supabase
    .from("print_units")
    .update({
      printing_completed: Boolean(body.printing_completed),
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