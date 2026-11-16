import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Shift = "day" | "night"

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: "備考の保存にはログインが必要です" }, { status: 401 })
    }

    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "入力内容が不正です" }, { status: 400 })
    }
    const { machineId, date, shiftCategory, memo } = body as Record<string, unknown>
    const validDate = typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date
    if (
      typeof machineId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(machineId) ||
      !validDate ||
      (shiftCategory !== "day" && shiftCategory !== "night") ||
      typeof memo !== "string" ||
      memo.length > 2000
    ) {
      return NextResponse.json({ success: false, error: "印刷機・日付・勤務区分・備考を確認してください" }, { status: 400 })
    }

    const { error } = await supabase
      .from("schedule_cell_memos")
      .upsert({
        machine_id: machineId,
        scheduled_date: date,
        shift_category: shiftCategory as Shift,
        memo,
        updated_by: authData.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "machine_id,scheduled_date,shift_category" })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : "備考の保存に失敗しました",
    }, { status: 500 })
  }
}
