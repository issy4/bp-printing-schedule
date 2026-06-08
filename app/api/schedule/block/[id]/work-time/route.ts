import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()
  const action = body.action as "start" | "stop" | "clear" | undefined

  if (!action) {
    return NextResponse.json(
      { success: false, error: "action が指定されていません" },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  if (action === "start") {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("schedule_blocks")
      .update({
        actual_start_at: now,
        actual_end_at: null,
        actual_work_minutes: null,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data })
  }

  if (action === "stop") {
  const now = new Date().toISOString()

  const { data: current, error: readError } = await supabase
    .from("schedule_blocks")
    .select("actual_start_at, print_unit_id")
    .eq("id", id)
    .single()

  if (readError) {
    return NextResponse.json(
      { success: false, error: readError.message },
      { status: 500 },
    )
  }

  if (!current?.actual_start_at) {
    return NextResponse.json(
      { success: false, error: "作業開始時刻が記録されていません" },
      { status: 400 },
    )
  }

  const startTime = new Date(current.actual_start_at).getTime()
  const endTime = new Date(now).getTime()
  const minutes = Math.max(0, Math.round((endTime - startTime) / 1000 / 60))

  const { data, error } = await supabase
    .from("schedule_blocks")
    .update({
      actual_end_at: now,
      actual_work_minutes: minutes,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }

  const { error: unitError } = await supabase
    .from("print_units")
    .update({
      printing_completed: true,
      status: "completed",
      updated_at: now,
    })
    .eq("id", current.print_unit_id)

  if (unitError) {
    return NextResponse.json(
      { success: false, error: unitError.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      printing_completed: true,
      unit_status: "completed",
    },
  })
}

  if (action === "clear") {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("schedule_blocks")
      .update({
        actual_start_at: null,
        actual_end_at: null,
        actual_work_minutes: null,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data })
  }

  return NextResponse.json(
    { success: false, error: "不正な action です" },
    { status: 400 },
  )
}