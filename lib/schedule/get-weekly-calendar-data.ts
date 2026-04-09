import { createClient } from "@/lib/supabase/server"
import type {
  MachineRow,
  ScheduleBlockRow,
  ShiftCategory,
  WeeklyCalendarCell,
  WeeklyCalendarData,
} from "@/types/schedule"
import { buildWeekDays, getWeekRange } from "./date"

function makeCellKey(machineId: string, shiftCategory: string, date: string) {
  return `${machineId}__${shiftCategory}__${date}`
}

function normalizeShift(shift: ShiftCategory): "day" | "night" {
  return shift === "night" ? "night" : "day"
}

function getShiftLabel(shift: "day" | "night"): "日勤" | "夜勤" {
  return shift === "night" ? "夜勤" : "日勤"
}

export async function getWeeklyCalendarData(baseDate?: string): Promise<WeeklyCalendarData> {
  const supabase = await createClient()
  const { start, startYmd, endYmd } = getWeekRange(baseDate)
  const weekDays = buildWeekDays(start)

  const [{ data: weekRows, error: weekError }, { data: unassignedRows, error: unassignedError }, { data: machines, error: machinesError }] =
    await Promise.all([
      supabase
        .from("vw_schedule_blocks_with_shift")
        .select("*")
        .gte("scheduled_date", startYmd)
        .lte("scheduled_date", endYmd)
        .order("scheduled_date", { ascending: true })
        .order("display_order", { ascending: true })
        .order("shift_sort_order", { ascending: true })
        .order("sequence_no", { ascending: true, nullsFirst: false }),

      supabase
        .from("vw_unassigned_schedule_blocks_with_shift")
        .select("*")
        .order("order_number", { ascending: true })
        .order("unit_name", { ascending: true }),

      supabase
        .from("machines")
        .select("id, machine_name, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ])

  if (weekError) {
    throw new Error(`週間予定の取得に失敗しました: ${weekError.message}`)
  }
  if (unassignedError) {
    throw new Error(`未割当案件の取得に失敗しました: ${unassignedError.message}`)
  }
  if (machinesError) {
    throw new Error(`印刷機マスタの取得に失敗しました: ${machinesError.message}`)
  }

  const typedWeekRows = (weekRows ?? []) as ScheduleBlockRow[]
  const typedUnassignedRows = (unassignedRows ?? []) as ScheduleBlockRow[]

  const machineRows: MachineRow[] = (machines ?? []).flatMap((m) => [
    {
      machine_id: m.id,
      machine_name: m.machine_name,
      display_order: m.display_order ?? 0,
      shift_category: "day",
      shift_label: "日勤",
      machine_shift_name: `${m.machine_name} 日勤`,
    },
    {
      machine_id: m.id,
      machine_name: m.machine_name,
      display_order: m.display_order ?? 0,
      shift_category: "night",
      shift_label: "夜勤",
      machine_shift_name: `${m.machine_name} 夜勤`,
    },
  ])

  const cells: Record<string, WeeklyCalendarCell> = {}

  for (const machineRow of machineRows) {
    for (const day of weekDays) {
      const key = makeCellKey(machineRow.machine_id, machineRow.shift_category, day.date)
      cells[key] = {
        machine_id: machineRow.machine_id,
        shift_category: machineRow.shift_category,
        date: day.date,
        blocks: [],
      }
    }
  }

  for (const row of typedWeekRows) {
    if (!row.machine_id || !row.scheduled_date) continue

    const shift = normalizeShift(row.shift_category)
    const key = makeCellKey(row.machine_id, shift, row.scheduled_date)

    if (!cells[key]) {
      cells[key] = {
        machine_id: row.machine_id,
        shift_category: shift,
        date: row.scheduled_date,
        blocks: [],
      }
    }

    cells[key].blocks.push(row)
  }

  for (const key of Object.keys(cells)) {
    cells[key].blocks.sort((a, b) => {
      const seqA = a.sequence_no ?? 9999
      const seqB = b.sequence_no ?? 9999
      if (seqA !== seqB) return seqA - seqB
      return a.unit_name.localeCompare(b.unit_name, "ja")
    })
  }

  return {
    weekDays,
    machineRows,
    cells,
    unassignedBlocks: typedUnassignedRows,
  }
}