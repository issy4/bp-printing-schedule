import { NextRequest, NextResponse } from "next/server"
import { getWeeklyCalendarData } from "@/lib/schedule/get-weekly-calendar-data"

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? undefined

  try {
    const data = await getWeeklyCalendarData(date)
    return NextResponse.json(data)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "週間予定データの取得に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}