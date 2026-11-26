import WeeklyScheduleBoard from "@/components/schedule/WeeklyScheduleBoard"
import ScheduleAuthBridge, { ScheduleSessionGuard } from "@/components/schedule/ScheduleAuthBridge"
import { getWeeklyCalendarData } from "@/lib/schedule/get-weekly-calendar-data"
import { getScheduleErpSession } from "@/lib/schedule/erp-session"

// 現行の週表示の日付計算を維持
function getTodayString() {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

export default async function SchedulePage() {
  let session: Awaited<ReturnType<typeof getScheduleErpSession>>
  try {
    session = await getScheduleErpSession()
  } catch {
    return (
      <main className="p-6">
        <h1 className="mb-4 text-xl font-bold">ERPの利用権限を確認できません</h1>
        <p>ERPの製造メニューから開き直してください。</p>
      </main>
    )
  }

  // 認証前はデータを取得・描画せず、ERPからの認証受け渡しのみ行う
  if (!session) {
    return <ScheduleAuthBridge />
  }

  const baseDate = getTodayString()
  const data = await getWeeklyCalendarData(baseDate, session.client)

  return (
    <ScheduleSessionGuard>
      <div className="p-4">
        <WeeklyScheduleBoard initialData={data} initialBaseDate={baseDate} />
      </div>
    </ScheduleSessionGuard>
  )
}
