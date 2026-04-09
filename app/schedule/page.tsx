import WeeklyScheduleBoard from "@/components/schedule/WeeklyScheduleBoard"
import { getWeeklyCalendarData } from "@/lib/schedule/get-weekly-calendar-data"

export default async function SchedulePage() {
  const data = await getWeeklyCalendarData("2026-04-08")

  return (
    <div className="p-4">
      <WeeklyScheduleBoard
        initialData={data}
        initialBaseDate="2026-04-08"
      />
    </div>
  )
}