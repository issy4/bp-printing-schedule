import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

export async function POST(request: NextRequest) {
  const auth = await requireScheduleApiSession(request)
  if (!auth.ok) return auth.response
  const supabase = auth.session.client

  const { data, error } = await supabase.rpc("import_legacy_print_schedule")

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data,
  })
}