"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

// WeeklyScheduleBoard.tsx と同じERP送信元の許可条件を使用する
const ERP_ORIGIN = process.env.NEXT_PUBLIC_ERP_ORIGIN || "https://erp.b-p.co.jp"

function isAllowedErpOrigin(origin: string): boolean {
  if (origin === "https://erp.b-p.co.jp" || origin === ERP_ORIGIN) return true

  try {
    const url = new URL(origin)
    return (
      url.origin === origin &&
      url.protocol === "https:" &&
      /^mqdriven-[a-z0-9]+-bp-5f70f10d\.vercel\.app$/.test(url.hostname)
    )
  } catch {
    return false
  }
}

export default function ScheduleAuthBridge() {
  const router = useRouter()
  const [status, setStatus] = React.useState("ERPのログイン情報を確認しています…")

  React.useEffect(() => {
    let active = true
    let finished = false
    let attempts = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const nonce = crypto.randomUUID()
    const opener = window.opener

    const stop = () => {
      finished = true
      if (interval) clearInterval(interval)
    }

    const requestSession = () => {
      if (!active || finished) return
      if (!opener || opener.closed) {
        setStatus("ERPとタブ間接続できません。ERPの製造メニューから開き直してください。")
        stop()
        return
      }
      if (attempts >= 8) {
        setStatus("ERPから応答がありません。ERPの製造メニューから開き直してください。")
        stop()
        return
      }

      attempts += 1
      // 認証情報ではなく、使い捨てnonceだけを親ウィンドウに送る
      opener.postMessage({ type: "printing-schedule:auth-request", nonce }, "*")
    }

    const receiveSession = async (event: MessageEvent) => {
      if (!active || finished || event.source !== opener || event.data?.nonce !== nonce) {
        return
      }
      if (!isAllowedErpOrigin(event.origin)) {
        setStatus(`ERPの送信元を確認できません：${event.origin}`)
        stop()
        return
      }

      if (event.data?.type === "printing-schedule:auth-error") {
        const message = event.data.message
        setStatus(
          message === "no-session"
            ? "ERP側の有効なログインが確認できません。"
            : message === "origin-mismatch"
              ? `印刷スケジュールのURLがERPの許可先と一致しません。ERPの設定: ${String(event.data.expected ?? "-")} / この画面: ${window.location.origin}`
              : "ERP側の認証取得でエラーが発生しました。",
        )
        stop()
        return
      }

      if (event.data?.type !== "printing-schedule:auth-response") return
      if (typeof event.data.accessToken !== "string") return

      // 同じnonceに対する重複応答によるPOSTを防ぐ
      const accessToken: string = event.data.accessToken
      stop()
      setStatus("ERP認証情報を受信・検証中…")

      try {
        const response = await fetch("/api/schedule/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ accessToken }),
        })

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          if (active) {
            setStatus(`認証検証エラー HTTP ${response.status}：${String(errorBody.error ?? "不明")}`)
          }
          return
        }

        if (active) {
          setStatus("ERP認証が完了しました。印刷スケジュールを表示します…")
          router.refresh()
        }
      } catch {
        if (active) setStatus("ERP認証の通信に失敗しました。ERPから開き直してください。")
      }
    }

    window.addEventListener("message", receiveSession)
    requestSession()
    if (!finished) interval = setInterval(requestSession, 1500)

    return () => {
      active = false
      window.removeEventListener("message", receiveSession)
      if (interval) clearInterval(interval)
    }
  }, [router])

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-bold">ERP認証が必要です</h1>
      <p className="mb-3 text-gray-600">
        印刷スケジュールは、ERPにログインして製造メニューから開いてください。
      </p>
      <p role="status" aria-live="polite" className="text-sm text-gray-700">
        {status}
      </p>
    </main>
  )
}
