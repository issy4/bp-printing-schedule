import WeeklyScheduleBoard from "@/components/schedule/WeeklyScheduleBoard"
import { getWeeklyCalendarData } from "@/lib/schedule/get-weekly-calendar-data"

// 今日の日付を YYYY-MM-DD 形式で取得
function getTodayString() {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

export default async function SchedulePage() {
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