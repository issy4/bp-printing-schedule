import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = {
  params: Promise<{
    id: string
  }>
}

type ScheduleBlockStatus =
  | "unassigned"
  | "tentative"
  | "assigned"
  | "confirmed"
  | "completed"

function normalizeStatus(body: Record<string, unknown>): ScheduleBlockStatus | undefined {
  if (typeof body.status === "string") {
    return body.status as ScheduleBlockStatus
  }

  const hasMachine = body.machine_id !== undefined && body.machine_id !== null && body.machine_id !== ""
  const hasDate =
    body.scheduled_date !== undefined &&
    body.scheduled_date !== null &&
    body.scheduled_date !== ""

  if (hasMachine || hasDate) {
    return "assigned"
  }

  return undefined
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {}

    if ("machine_id" in body) {
      updateData.machine_id = body.machine_id || null
    }

    if ("scheduled_date" in body) {
      updateData.scheduled_date = body.scheduled_date || null
    }

    if ("shift_category" in body) {
      updateData.shift_category = body.shift_category || null
    }

    if ("sequence_no" in body) {
      updateData.sequence_no =
        body.sequence_no === null || body.sequence_no === ""
          ? null
          : Number(body.sequence_no)
    }

    if ("planned_print_count" in body) {
      updateData.planned_print_count =
        body.planned_print_count === null || body.planned_print_count === ""
          ? null
          : Number(body.planned_print_count)
    }

    if ("note" in body) {
      updateData.note = body.note ?? null
    }

    const nextStatus = normalizeStatus(body)

    if (nextStatus) {
      updateData.status = nextStatus
    }

    updateData.updated_at = new Date().toISOString()

    const { data: updatedBlock, error: blockError } = await supabase
      .from("schedule_blocks")
      .update(updateData)
      .eq("id", id)
      .select("id, print_unit_id, machine_id, scheduled_date, shift_category, status")
      .single()

    if (blockError) {
      return NextResponse.json(
        {
          success: false,
          error: blockError.message,
        },
        { status: 500 },
      )
    }

    if (updatedBlock?.print_unit_id && nextStatus) {
      const { error: unitError } = await supabase
        .from("print_units")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedBlock.print_unit_id)

      if (unitError) {
        return NextResponse.json(
          {
            success: false,
            error: unitError.message,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedBlock,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "schedule_blocks の更新に失敗しました"

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}