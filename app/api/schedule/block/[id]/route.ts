import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("PATCH API HIT")
  try {
    const { id } = await params

    const body = await request.json()

    const supabase = await createClient()

    const updateData: Record<string, any> = {}

    // 印刷機
    if (body.machine_id !== undefined) {
      updateData.machine_id = body.machine_id
    }

    // 日付
    if (body.scheduled_date !== undefined) {
      updateData.scheduled_date = body.scheduled_date
    }

    // 日勤 / 夜勤
    if (body.shift_category !== undefined) {
      updateData.shift_category = body.shift_category
    }

    // 表示順
    if (body.sequence_no !== undefined) {
      updateData.sequence_no = body.sequence_no
    }

    // チェック項目
    if (body.dtp_completed !== undefined) {
      updateData.dtp_completed = body.dtp_completed
    }

    if (body.paper_stacked !== undefined) {
      updateData.paper_stacked = body.paper_stacked
    }

    if (body.plate_completed !== undefined) {
      updateData.plate_completed = body.plate_completed
    }

    if (body.pp_processed !== undefined) {
      updateData.pp_processed = body.pp_processed
    }

    if (body.printing_completed !== undefined) {
      updateData.printing_completed = body.printing_completed
    }

    // 特記
    if (body.note !== undefined) {
      updateData.note = body.note
    }

    // 作業時間
    if (body.work_time !== undefined) {
      updateData.work_time = body.work_time
    }

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("schedule_blocks")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

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
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: e.message,
      },
      { status: 500 }
    )
  }
}