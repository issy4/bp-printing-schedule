function formatYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getWeekRange(baseDate?: string) {
  const today = baseDate ? new Date(baseDate) : new Date()
  const day = today.getDay() // 0:日曜
  const start = new Date(today)
  start.setDate(today.getDate() - day)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return {
    start,
    end,
    startYmd: formatYmd(start),
    endYmd: formatYmd(end),
  }
}

export function buildWeekDays(startDate: Date) {
  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"]

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)

    return {
      date: formatYmd(d),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: weekdayLabels[d.getDay()],
    }
  })
}