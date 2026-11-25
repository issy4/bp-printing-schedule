
import WeeklyScheduleBoard from "@/components/schedule/WeeklyScheduleBoard"
import { getWeeklyCalendarData } from "@/lib/schedule/get-weekly-calendar-data"
import { getScheduleErpSession } from "@/lib/schedule/erp-session"

// 今日の日付を YYYY-MM-DD 形式で取得
function getTodayString() {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

export default async function SchedulePage() {
  // ERPの認証セッションを確認
  const session = await getScheduleErpSession()

  // 未認証の場合は印刷予定を取得しない
  if (!session) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-bold mb-4">
          ERP認証が必要です
        </h1>

        <p className="text-gray-600">
          印刷スケジュールを表示するには、
          ERPにログインしてから開き直してください。
        </p>
      </main>
    )
  }

  // 認証済みの場合のみ印刷予定を取得
  const baseDate = getTodayString()

  const data = await getWeeklyCalendarData(baseDate)

  return (
    <div className="p-4">
      <WeeklyScheduleBoard
        initialData={data}
        initialBaseDate={baseDate}
      />
    </div>
  )
}
