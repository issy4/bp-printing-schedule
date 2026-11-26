import { NextRequest, NextResponse } from "next/server"
import { requireScheduleApiSession } from "@/lib/schedule/require-api-session"

// MQの手入力。基幹由来のsource_amountは一切更新しない。
export async function PATCH(request: NextRequest) {
  const auth = await requireScheduleApiSession(request)
  if (!auth.ok) return auth.response

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: "入力形式が不正です" }, { status: 400 })
  }

  const { key, amount } = body as Record<string, unknown>
  if (typeof key !== "string" ||
      !/^(legacy:\d+|item:[0-9a-fA-F-]{36})$/.test(key)) {
    return NextResponse.json({ success: false, error: "MQの対象が不正です" }, { status: 400 })
  }

  // null / 空文字なら手動修正を解除し、基幹金額に戻す
  let value: number | null = null
  if (amount !== null && amount !== "") {
    if (typeof amount !== "string" && typeof amount !== "number") {
      return NextResponse.json({ success: false, error: "MQは整数で入力してください" }, { status: 400 })
    }
    const str = String(amount)
    if (!/^\d{1,12}$/.test(str)) {
      return NextResponse.json({ success: false, error: "MQは0以上の整数で入力してください" }, { status: 400 })
    }
    value = Number(str)
    if (!Number.isSafeInteger(value) || value > 999999999999) {
      return NextResponse.json({ success: false, error: "MQが入力範囲を超えています" }, { status: 400 })
    }
  }

  const { data, error } = await auth.session.client.rpc("set_schedule_mq_manual", {
    p_mq_key: key,
    p_amount: value,
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data }, {
    headers: { "Cache-Control": "no-store" },
  })
}
