import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { getScheduleErpSession } from "@/lib/schedule/erp-session"

type Session = NonNullable<Awaited<ReturnType<typeof getScheduleErpSession>>>
type Result = { ok: true; session: Session } | { ok: false; response: NextResponse }

function deny(status: number, error: string): Result {
  return {
    ok: false,
    response: NextResponse.json({ success: false, error }, {
      status,
      headers: { "Cache-Control": "no-store" },
    }),
  }
}

// 全業務APIの入口で認証する。変更系は同一オリジンのリクエストだけ許可する。
export async function requireScheduleApiSession(request: NextRequest): Promise<Result> {
  if (request.method !== "GET" && request.method !== "HEAD" &&
      request.headers.get("origin") !== new URL(request.url).origin) {
    return deny(403, "不正なアクセス元です")
  }

  try {
    const session = await getScheduleErpSession()
    if (!session) return deny(401, "ERPから開き直してください（認証期限切れ）")
    return { ok: true, session }
  } catch {
    // 認証サービスが利用できない場合も、未検証のままDBへ進まない。
    return deny(503, "ERP認証を確認できません。再度お試しください")
  }
}
