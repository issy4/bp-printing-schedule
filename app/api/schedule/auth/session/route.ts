import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ERP_SESSION_COOKIE, getScheduleErpSession, verifyErpAccessToken } from "@/lib/schedule/erp-session"

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  return origin === new URL(request.url).origin
}

export async function GET() {
  const session = await getScheduleErpSession()
  return NextResponse.json(
    { authenticated: !!session },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "不正なアクセス元です" }, { status: 403 })
  }
  const body = await request.json().catch(() => ({}))
  if (typeof body.accessToken !== "string") {
    return NextResponse.json({ error: "認証情報がありません" }, { status: 400 })
  }
  // ERPから送られたSupabase Authのトークンを認証サーバーで確認する
  const verified = await verifyErpAccessToken(body.accessToken)
  if (!verified) {
    return NextResponse.json({ error: "ERPログインの確認に失敗しました" }, { status: 401 })
  }

  // Auth APIがトークンを失効させれば、保存時の再検証で拒否される
  (await cookies()).set(ERP_SESSION_COOKIE, body.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 45 * 60,
  })
  return NextResponse.json({ authenticated: true })
}


// ブラウザ側のERP認証が解除されたとき、スケジュール専用Cookieも破棄する。
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "不正なアクセス元です" }, { status: 403 })
  }
  ;(await cookies()).set(ERP_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return NextResponse.json({ authenticated: false }, {
    headers: { "Cache-Control": "no-store" },
  })
}
