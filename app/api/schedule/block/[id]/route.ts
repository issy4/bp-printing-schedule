
import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

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

const ALLOWED_STATUSES: ScheduleBlockStatus[] = [
  "unassigned",
  "tentative",
  "assigned",
  "confirmed",
  "completed",
]

function normalizeStatus(
  body: Record<string, unknown>,
): ScheduleBlockStatus | undefined {
  if (typeof body.status === "string") {
    return body.status as ScheduleBlockStatus
  }

  const hasMachine =
    body.machine_id !== undefined &&
    body.machine_id !== null &&
    body.machine_id !== ""

  const hasDate =
    body.scheduled_date !== undefined &&
    body.scheduled_date !== null &&
    body.scheduled_date !== ""

  if (hasMachine || hasDate) {
    return "assigned"
  }

  return undefined
}

export async function PATCH(
  request: NextRequest,
  { params }: Params,
) {
  try {
    const auth = await requireScheduleApiSession(request)
    if (!auth.ok) return auth.response
    const supabase = auth.session.client

    // 3. 更新対象IDの取得
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "印刷ブロックIDがありません",
        },
        { status: 400 },
      )
    }

    // 4. JSONデータの検証
    const rawBody: unknown = await request
      .json()
      .catch(() => null)

    if (
      !rawBody ||
      typeof rawBody !== "object" ||
      Array.isArray(rawBody)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "入力内容が不正です",
        },
        { status: 400 },
      )
    }

    const body = rawBody as Record<string, unknown>

    // 5. ステータスの検証
    if (
      "status" in body &&
      (
        typeof body.status !== "string" ||
        !ALLOWED_STATUSES.includes(
          body.status as ScheduleBlockStatus,
        )
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "ステータスが不正です",
        },
        { status: 400 },
      )
    }

    // 6. 更新データの作成
    const updateData: Record<string, unknown> = {}

    if ("machine_id" in body) {
      updateData.machine_id = body.machine_id || null
    }

    if ("scheduled_date" in body) {
      updateData.scheduled_date =
        body.scheduled_date || null
    }

    if ("shift_category" in body) {
      updateData.shift_category =
        body.shift_category || null
    }

    if ("sequence_no" in body) {
      const value = body.sequence_no

      if (value === null || value === "") {
        updateData.sequence_no = null
      } else {
        const numberValue = Number(value)

        if (
          typeof value === "boolean" ||
          value === undefined ||
          !Number.isSafeInteger(numberValue) ||
          numberValue < 0
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "順序番号が不正です",
            },
            { status: 400 },
          )
        }

        updateData.sequence_no = numberValue
      }
    }

    if ("planned_print_count" in body) {
      const value = body.planned_print_count

      if (value === null || value === "") {
        updateData.planned_print_count = null
      } else {
        const numberValue = Number(value)

        if (
          typeof value === "boolean" ||
          value === undefined ||
          !Number.isSafeInteger(numberValue) ||
          numberValue < 0
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "印刷予定枚数が不正です",
            },
            { status: 400 },
          )
        }

        updateData.planned_print_count = numberValue
      }
    }

    if ("note" in body) {
      updateData.note = body.note ?? null
    }

    // 7. ステータスの確定
    const nextStatus = normalizeStatus(body)

    if (nextStatus) {
      updateData.status = nextStatus
    }

    updateData.updated_at = new Date().toISOString()

    // 8. 印刷ブロックの更新
    const {
      data: updatedBlock,
      error: blockError,
    } = await supabase
      .from("schedule_blocks")
      .update(updateData)
      .eq("id", id)
      .select(
        "id, print_unit_id, machine_id, scheduled_date, shift_category, status",
      )
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

    // 9. 印刷台のステータスを連動更新
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

    // 10. 正常終了
    return NextResponse.json({
      success: true,
      data: updatedBlock,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "schedule_blocks の更新に失敗しました"

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
