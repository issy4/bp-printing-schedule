"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"

export type ShiftCategory = "day" | "night" | null

export type ScheduleBlockRow = {
  block_id: string
  print_unit_id: string
  block_no: number
  scheduled_date: string | null
  machine_id: string | null
  shift_category: ShiftCategory
  shift_label: string
  shift_sort_order: number
  sequence_no: number | null
  planned_print_count: number | null
  block_note: string | null
  actual_start_at: string | null
  actual_end_at: string | null
  actual_work_minutes: number | null
  block_status:
    | "unassigned"
    | "tentative"
    | "assigned"
    | "confirmed"
    | "completed"
  machine_name: string | null
  manufacturer: string | null
  machine_type: string | null
  sheet_group: string | null
  perfecting_type: string | null
  display_order: number | null
  machine_is_active: boolean | null
  machine_shift_name: string
  print_unit_id_ref: string
  print_item_id: string
  unit_no: number
  unit_name: string
  assigned_machine_id: string | null
  unit_status: "unassigned" | "assigned" | "confirmed" | "completed"
  print_item_id_ref: string
  order_entry_id: string
  source_file_id: string | null
  part_name: string
  default_machine_id: string | null
  plate_size: string | null
  color_front: number | null
  color_back: number | null
  color_note: string | null
  has_special_color: boolean | null
  print_count: number | null
  press_count: number
  imposition: string | null
  page_count: number | null
  fold_count: number | null
  print_item_note: string | null
  dtp_completed: boolean | null
  paper_stacked: boolean | null
  plate_completed: boolean | null
  pp_processed: boolean | null
  printing_completed: boolean | null
  order_number: string | null
  customer_code: string | null
  customer_name: string | null
  product_name: string | null
  sales_user_code: string | null
  order_date: string | null
  source_file_name: string | null
  source_file_url: string | null
  source_file_type: string | null
  source_file_is_instruction: boolean | null
  source_file_parsed_status: string | null
  source_file_version_no: number | null
  source_file_is_latest: boolean | null
}

export type MachineRow = {
  machine_id: string
  machine_name: string
  display_order: number
  shift_category: "day" | "night"
  shift_label: "日勤" | "夜勤"
  machine_shift_name: string
}

export type WeekDay = {
  date: string
  label: string
  weekday: string
}

export type WeeklyCalendarCell = {
  machine_id: string
  shift_category: "day" | "night"
  date: string
  blocks: ScheduleBlockRow[]
}

export type WeeklyCalendarData = {
  weekDays: WeekDay[]
  machineRows: MachineRow[]
  cells: Record<string, WeeklyCalendarCell>
  unassignedBlocks: ScheduleBlockRow[]
}

type WeeklyScheduleBoardProps = {
  initialData?: WeeklyCalendarData
  initialBaseDate?: string
}

type PrintItemProgressField =
  | "dtp_completed"
  | "paper_stacked"
  | "plate_completed"
  | "pp_processed"
  | "has_special_color"

type UnitProgressField = "printing_completed"

type ProgressField = PrintItemProgressField | UnitProgressField

type DragBlockSource = "unassigned" | "assigned"

type DragBlockData = {
  type: "schedule-block"
  source: DragBlockSource
  block: ScheduleBlockRow
}

type ScheduleCellDropData = {
  type: "schedule-cell"
  machineId: string
  date: string
  shiftCategory: "day" | "night"
}

type UnassignedDropData = {
  type: "unassigned-area"
}

const SCHEDULE_CELL_GRID =
  "grid-cols-[44px_72px_240px_34px_34px_34px_34px_120px_58px_52px_90px_34px_72px_90px_90px_34px]"

const SCHEDULE_CELL_GRID_FOCUSED =
  "grid-cols-[52px_90px_360px_42px_42px_42px_42px_170px_80px_70px_130px_44px_96px_130px_110px_44px]"

const SCHEDULE_TABLE_MIN_WIDTH = "min-w-[8200px]"
const SCHEDULE_TABLE_MIN_WIDTH_FOCUSED = "min-w-[10400px]"

const MACHINE_COLUMN_WIDTH = "min-w-[104px]"
const MACHINE_COLUMN_WIDTH_FOCUSED = "min-w-[120px]"

const DAY_COLUMN_WIDTH_PX = 1150
const DAY_COLUMN_WIDTH_PX_FOCUSED = 1450

const SCHEDULE_CELL_MIN_HEIGHT = 104
const SCHEDULE_CELL_MIN_HEIGHT_FOCUSED = 180

function formatDateJP(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getWeekdayJP(dateStr: string) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"]
  return weekdays[new Date(dateStr).getDay()]
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function formatYmd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function buildWeekDaysFromBase(baseDate?: string): WeekDay[] {
  const base = baseDate ? new Date(baseDate) : new Date()
  const start = startOfWeek(base)

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const date = formatYmd(d)

    return {
      date,
      label: formatDateJP(date),
      weekday: getWeekdayJP(date),
    }
  })
}

function makeCellKey(machineId: string, shiftCategory: string, date: string) {
  return `${machineId}__${shiftCategory}__${date}`
}

function compactNumber(value: number | null) {
  if (value == null) return "-"
  return value.toLocaleString("ja-JP")
}

function formatDateTimeJP(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value)

  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`
}

function formatWorkMinutes(value?: number | null) {
  if (value == null) return "-"

  const hours = Math.floor(value / 60)
  const minutes = value % 60

  if (hours <= 0) return `${minutes}分`
  if (minutes === 0) return `${hours}時間`

  return `${hours}時間${minutes}分`
}

function formatColorCount(item: ScheduleBlockRow) {
  const front = item.color_front != null ? item.color_front : "-"
  const back = item.color_back != null ? item.color_back : "-"
  return `${front}/${back}`
}

function formatSpecialColor(item: ScheduleBlockRow) {
  if (item.color_note && item.color_note.trim() !== "") return item.color_note
  return "-"
}

function getStatusLabel(status: ScheduleBlockRow["block_status"]) {
  switch (status) {
    case "unassigned":
      return "未割当"
    case "tentative":
      return "仮"
    case "assigned":
      return "割当済"
    case "confirmed":
      return "確定"
    case "completed":
      return "完了"
  }
}

function buildEmptyData(baseDate?: string): WeeklyCalendarData {
  const weekDays = buildWeekDaysFromBase(baseDate)

  return {
    weekDays,
    machineRows: [],
    cells: {},
    unassignedBlocks: [],
  }
}

async function fetchWeeklyCalendarData(baseDate?: string): Promise<WeeklyCalendarData> {
  const qs = new URLSearchParams()
  if (baseDate) qs.set("date", baseDate)

  const res = await fetch(`/api/schedule/weekly?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? "週間予定データの取得に失敗しました")
  }

  return res.json()
}

export default function WeeklyScheduleBoard({
  initialData,
  initialBaseDate,
}: WeeklyScheduleBoardProps) {
  const [baseDate, setBaseDate] = React.useState<string>(
    initialBaseDate ?? formatYmd(new Date()),
  )
  const [data, setData] = React.useState<WeeklyCalendarData>(
    initialData ?? buildEmptyData(initialBaseDate),
  )
  const [loading, setLoading] = React.useState(!initialData)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [showUnassignedOnly, setShowUnassignedOnly] = React.useState(true)
  const [machineFilter, setMachineFilter] = React.useState<string>("all")
  const [selectedBlock, setSelectedBlock] = React.useState<ScheduleBlockRow | null>(null)
  const [selectedUnassignedBlockIds, setSelectedUnassignedBlockIds] = React.useState<Set<string>>(
    () => new Set(),
  )
  const [selectedAssignedBlockIds, setSelectedAssignedBlockIds] = React.useState<Set<string>>(
  () => new Set(),
)
  const [draggingBlock, setDraggingBlock] = React.useState<ScheduleBlockRow | null>(null)
  const [unassignedCollapsed, setUnassignedCollapsed] = React.useState(false)

  const isMachineFocused = machineFilter !== "all"
const scheduleCellGrid = isMachineFocused ? SCHEDULE_CELL_GRID_FOCUSED : SCHEDULE_CELL_GRID
const scheduleTableMinWidth = isMachineFocused
  ? SCHEDULE_TABLE_MIN_WIDTH_FOCUSED
  : SCHEDULE_TABLE_MIN_WIDTH
const machineColumnWidth = isMachineFocused
  ? MACHINE_COLUMN_WIDTH_FOCUSED
  : MACHINE_COLUMN_WIDTH
const dayColumnWidthPx = isMachineFocused
  ? DAY_COLUMN_WIDTH_PX_FOCUSED
  : DAY_COLUMN_WIDTH_PX

  const scheduleCellMinHeight = isMachineFocused
  ? SCHEDULE_CELL_MIN_HEIGHT_FOCUSED
  : SCHEDULE_CELL_MIN_HEIGHT

  const topScrollRef = React.useRef<HTMLDivElement | null>(null)
  const bodyScrollRef = React.useRef<HTMLDivElement | null>(null)
  const isSyncingScroll = React.useRef(false)
  const lastAutoScrolledWeekKey = React.useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const loadData = React.useCallback(
    async (date?: string) => {
      try {
        setLoading(true)
        setError(null)
        const next = await fetchWeeklyCalendarData(date ?? baseDate)
        setData(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました")
      } finally {
        setLoading(false)
      }
    },
    [baseDate],
  )

  React.useEffect(() => {
    if (!initialData) {
      void loadData(baseDate)
    }
  }, [initialData, baseDate, loadData])

  const weekRangeLabel = React.useMemo(() => {
    const days = data.weekDays
    if (!days.length) return ""
    return `${days[0].label} ～ ${days[days.length - 1].label}`
  }, [data.weekDays])

  const filteredUnassigned = React.useMemo(() => {
    const q = query.trim().toLowerCase()

    return data.unassignedBlocks.filter((item) => {
      const haystack = [
        item.unit_name,
        item.part_name,
        item.order_number,
        item.product_name,
        item.customer_name,
        item.plate_size,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      if (!showUnassignedOnly) return !q || haystack.includes(q)

      return (!item.machine_id || !item.scheduled_date) && (!q || haystack.includes(q))
    })
  }, [data.unassignedBlocks, query, showUnassignedOnly])

  const selectedUnassignedBlocks = React.useMemo(() => {
    if (selectedUnassignedBlockIds.size === 0) return []

    const selectedIds = selectedUnassignedBlockIds
    return data.unassignedBlocks.filter((item) => selectedIds.has(item.block_id))
  }, [data.unassignedBlocks, selectedUnassignedBlockIds])

  const selectedUnassignedCount = selectedUnassignedBlocks.length 

  React.useEffect(() => {
    setSelectedUnassignedBlockIds((current) => {
      if (current.size === 0) return current

      const existingIds = new Set(data.unassignedBlocks.map((item) => item.block_id))
      const next = new Set(Array.from(current).filter((id) => existingIds.has(id)))

      if (next.size === current.size) return current
      return next
    })
  }, [data.unassignedBlocks])

  function toggleUnassignedSelection(block: ScheduleBlockRow) {
    setSelectedUnassignedBlockIds((current) => {
      const next = new Set(current)

      if (next.has(block.block_id)) {
        next.delete(block.block_id)
      } else {
        next.add(block.block_id)
      }

      return next
    })
  }

  function toggleAssignedSelection(block: ScheduleBlockRow) {
  setSelectedAssignedBlockIds((current) => {
    const next = new Set(current)

    if (next.has(block.block_id)) {
      next.delete(block.block_id)
    } else {
      next.add(block.block_id)
    }

    return next
  })
}

function clearAssignedSelection() {
  setSelectedAssignedBlockIds(new Set())
}

  function clearUnassignedSelection() {
    setSelectedUnassignedBlockIds(new Set())
  }

  const machineRows = React.useMemo(() => {
    return data.machineRows.filter((row) => {
      if (machineFilter === "all") return true
      return row.machine_id === machineFilter
    })
  }, [data.machineRows, machineFilter])

  const today = formatYmd(new Date())

  React.useEffect(() => {
    const todayIndex = data.weekDays.findIndex((day) => day.date === today)
    const weekKey = data.weekDays.map((day) => day.date).join("|")

    if (todayIndex < 0 || !weekKey || lastAutoScrolledWeekKey.current === weekKey) {
      return
    }

    lastAutoScrolledWeekKey.current = weekKey

    requestAnimationFrame(() => {
      const scrollLeft = todayIndex * dayColumnWidthPx

      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = scrollLeft
      }

      if (bodyScrollRef.current) {
        bodyScrollRef.current.scrollLeft = scrollLeft
      }
    })
  }, [data.weekDays, today, dayColumnWidthPx])

  const goWeek = (direction: -1 | 1) => {
    const base = new Date(baseDate)
    base.setDate(base.getDate() + direction * 7)
    const next = formatYmd(base)
    setBaseDate(next)
    void loadData(next)
  }

  const goCurrentWeek = () => {
    const next = formatYmd(new Date())
    setBaseDate(next)
    void loadData(next)
  }

  async function handleImportLegacyData() {
  if (!confirm("基幹データから未割当案件を取り込みますか？")) return

  try {
    setLoading(true)
    setError(null)

    const res = await fetch("/api/schedule/import-legacy", {
      method: "POST",
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(body.error ?? "基幹データの取込に失敗しました")
    }

    await loadData(baseDate)

    alert("基幹データの取込が完了しました。")
  } catch (e) {
    setError(e instanceof Error ? e.message : "基幹データの取込に失敗しました")
  } finally {
    setLoading(false)
  }
}

  function syncScroll(source: "top" | "body") {
    if (isSyncingScroll.current) return

    const top = topScrollRef.current
    const body = bodyScrollRef.current
    if (!top || !body) return

    isSyncingScroll.current = true

    if (source === "top") {
      body.scrollLeft = top.scrollLeft
    } else {
      top.scrollLeft = body.scrollLeft
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

  async function handleToggleProgress(
    block: ScheduleBlockRow,
    field: ProgressField,
    checked: boolean,
  ) {
    const previousData = data
    const scope = field === "printing_completed" ? "block" : "print_item"

    setData((current) =>
      updateBlockInCalendarData(current, block, { [field]: checked }, { scope }),
    )

    const endpoint =
      field === "printing_completed"
        ? `/api/schedule/print-unit/${block.print_unit_id}/progress`
        : `/api/schedule/print-item/${block.print_item_id}/progress`

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: checked }),
    })

    if (!res.ok) {
      setData(previousData)
      alert("進捗の保存に失敗しました。")
    }
  }

  async function handleSaveNote(block: ScheduleBlockRow, note: string) {
    const previousData = data

    setData((current) => updateBlockInCalendarData(current, block, { block_note: note }))

    const res = await fetch(`/api/schedule/block/${block.block_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    })

    if (!res.ok) {
      setData(previousData)
      alert("特記の保存に失敗しました。")
    }
  }

  async function handleWorkTimeAction(
  block: ScheduleBlockRow,
  action: "start" | "stop" | "clear",
) {
  const previousData = data

  try {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/schedule/block/${block.block_id}/work-time`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(body.error ?? "作業時間の保存に失敗しました")
    }

    await refreshDataSilently(baseDate)

    if (selectedBlock?.block_id === block.block_id) {
      setSelectedBlock((current) =>
        current
          ? {
              ...current,
              actual_start_at: body.data?.actual_start_at ?? null,
              actual_end_at: body.data?.actual_end_at ?? null,
              actual_work_minutes: body.data?.actual_work_minutes ?? null,
            }
          : current,
      )
    }
  } catch (e) {
    setData(previousData)
    setError(e instanceof Error ? e.message : "作業時間の保存に失敗しました")
  } finally {
    setLoading(false)
  }
}

  async function handleMoveBlockOrder(block: ScheduleBlockRow, direction: "up" | "down") {
    if (!block.machine_id || !block.scheduled_date || !block.shift_category) return

    const key = makeCellKey(block.machine_id, block.shift_category, block.scheduled_date)
    const currentCell = data.cells[key]
    if (!currentCell) return

    const sortedBlocks = [...currentCell.blocks].sort((a, b) => {
      const seqA = a.sequence_no ?? 9999
      const seqB = b.sequence_no ?? 9999
      if (seqA !== seqB) return seqA - seqB
      return a.unit_name.localeCompare(b.unit_name, "ja")
    })

    const currentIndex = sortedBlocks.findIndex((b) => b.block_id === block.block_id)
    if (currentIndex < 0) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedBlocks.length) return

    const currentBlock = sortedBlocks[currentIndex]
    const targetBlock = sortedBlocks[targetIndex]
    const currentSeq = currentBlock.sequence_no ?? currentIndex + 1
    const targetSeq = targetBlock.sequence_no ?? targetIndex + 1
    const previousData = data

    setData((current) =>
      swapBlockSequenceInCalendarData(current, currentBlock, targetBlock, currentSeq, targetSeq),
    )

    const [resA, resB] = await Promise.all([
      fetch(`/api/schedule/block/${currentBlock.block_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence_no: targetSeq }),
      }),
      fetch(`/api/schedule/block/${targetBlock.block_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence_no: currentSeq }),
      }),
    ])

    if (!resA.ok || !resB.ok) {
      setData(previousData)
      alert("順番の保存に失敗しました。")
      return
    }

    await refreshDataSilently(baseDate)
  }

  async function updateBlockAssignment({
    block,
    machineId,
    date,
    shiftCategory,
    sequenceNo,
  }: {
    block: ScheduleBlockRow
    machineId: string | null
    date: string | null
    shiftCategory: "day" | "night" | null
    sequenceNo?: number | null
  }) {
    const isUnassign = !machineId || !date || !shiftCategory

    const res = await fetch(`/api/schedule/block/${block.block_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isUnassign
          ? {
              machine_id: null,
              scheduled_date: null,
              shift_category: null,
              sequence_no: null,
              status: "unassigned",
            }
          : {
              machine_id: machineId,
              scheduled_date: date,
              shift_category: shiftCategory,
              sequence_no: sequenceNo ?? null,
              status: "assigned",
            },
      ),
    })

    if (!res.ok) {
      alert(isUnassign ? "未割当への戻し処理に失敗しました。" : "割当の保存に失敗しました。")
      return false
    }

    return true
  }

  async function refreshDataSilently(date?: string) {
    try {
      const next = await fetchWeeklyCalendarData(date ?? baseDate)
      setData(next)
    } catch {
      // 楽観的更新後の同期に失敗しても、操作自体は成功している可能性があるため表示は維持します
    }
  }

  async function handleAssignBlocksToCell({
    blocks,
    machineId,
    date,
    shiftCategory,
  }: {
    blocks: ScheduleBlockRow[]
    machineId: string
    date: string
    shiftCategory: "day" | "night"
  }) {
    if (blocks.length === 0) return

    const previousData = data
    const startSequenceNo = getNextSequenceNo(data, machineId, shiftCategory, date)

    setData((current) =>
      blocks.reduce((nextData, block, index) => {
        return moveBlockInCalendarData(nextData, block, {
          machineId,
          date,
          shiftCategory,
          sequenceNo: startSequenceNo + index,
        })
      }, current),
    )
    clearUnassignedSelection()

    const results = await Promise.all(
      blocks.map((block, index) =>
        updateBlockAssignment({
          block,
          machineId,
          date,
          shiftCategory,
          sequenceNo: startSequenceNo + index,
        }),
      ),
    )

    if (results.some((ok) => !ok)) {
      setData(previousData)
      return
    }

    await refreshDataSilently(baseDate)
  }

  async function handleAssignBlockToCell({
    block,
    machineId,
    date,
    shiftCategory,
  }: {
    block: ScheduleBlockRow | null
    machineId: string
    date: string
    shiftCategory: "day" | "night"
  }) {
    const blocks = selectedUnassignedBlocks.length > 0 ? selectedUnassignedBlocks : block ? [block] : []

    await handleAssignBlocksToCell({
      blocks,
      machineId,
      date,
      shiftCategory,
    })
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragBlockData | undefined
    if (data?.block) setDraggingBlock(data.block)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const dragData = event.active.data.current as DragBlockData | undefined
    const dropData = event.over?.data.current as ScheduleCellDropData | UnassignedDropData | undefined

    setDraggingBlock(null)

    if (!dragData?.block || !dropData) return

    const previousData = data

    if (dropData.type === "schedule-cell") {
      const blocksToMove =
        dragData.source === "unassigned" && selectedUnassignedBlockIds.has(dragData.block.block_id)
          ? selectedUnassignedBlocks
          : [dragData.block]

      const startSequenceNo = getNextSequenceNo(
        data,
        dropData.machineId,
        dropData.shiftCategory,
        dropData.date,
      )

      setData((current) =>
        blocksToMove.reduce((nextData, block, index) => {
          return moveBlockInCalendarData(nextData, block, {
            machineId: dropData.machineId,
            date: dropData.date,
            shiftCategory: dropData.shiftCategory,
            sequenceNo: startSequenceNo + index,
          })
        }, current),
      )
      clearUnassignedSelection()

      const results = await Promise.all(
        blocksToMove.map((block, index) =>
          updateBlockAssignment({
            block,
            machineId: dropData.machineId,
            date: dropData.date,
            shiftCategory: dropData.shiftCategory,
            sequenceNo: startSequenceNo + index,
          }),
        ),
      )

      if (results.some((ok) => !ok)) {
        setData(previousData)
        return
      }

      await refreshDataSilently(baseDate)
      return
    }

    if (dropData.type === "unassigned-area" && dragData.source === "assigned") {
      setData((current) =>
        moveBlockInCalendarData(current, dragData.block, {
          machineId: null,
          date: null,
          shiftCategory: null,
        }),
      )
      setSelectedBlock(null)

      const ok = await updateBlockAssignment({
        block: dragData.block,
        machineId: null,
        date: null,
        shiftCategory: null,
      })

      if (!ok) {
        setData(previousData)
        return
      }

      await refreshDataSilently(baseDate)
    }
  }

  async function handleUnassignBlock(block: ScheduleBlockRow) {
    if (!confirm("この案件を未割当に戻しますか？")) return

    const previousData = data

    setData((current) =>
      moveBlockInCalendarData(current, block, {
        machineId: null,
        date: null,
        shiftCategory: null,
      }),
    )
    setSelectedBlock(null)

    const ok = await updateBlockAssignment({
      block,
      machineId: null,
      date: null,
      shiftCategory: null,
    })

    if (!ok) {
      setData(previousData)
      return
    }

    await refreshDataSilently(baseDate)
  }

  async function handleUnassignCellBlocks(blocks: ScheduleBlockRow[]) {
  if (blocks.length === 0) return

  const label = `${blocks[0]?.machine_name ?? ""} / ${blocks[0]?.scheduled_date ?? ""} / ${blocks[0]?.shift_label ?? ""}`

  if (!confirm(`このセルの案件 ${blocks.length}件を未割当に戻しますか？\n\n${label}`)) {
    return
  }

  const previousData = data
  const blockIds = blocks.map((block) => block.block_id)

  try {
    setLoading(true)
    setError(null)

    let nextData = data
    for (const block of blocks) {
      nextData = moveBlockInCalendarData(nextData, block, {
        machineId: null,
        date: null,
        shiftCategory: null,
      })
    }
    setData(nextData)

    const res = await fetch("/api/schedule/blocks/unassign", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blockIds }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(body.error ?? "一括未割当処理に失敗しました")
    }

    await refreshDataSilently(baseDate)
  } catch (e) {
    setData(previousData)
    setError(e instanceof Error ? e.message : "一括未割当処理に失敗しました")
  } finally {
    setLoading(false)
  }
}

async function handleUnassignSelectedAssignedBlocks(blocks: ScheduleBlockRow[]) {
  const selectedBlocks = blocks.filter((block) =>
    selectedAssignedBlockIds.has(block.block_id),
  )

  if (selectedBlocks.length === 0) return

  if (!confirm(`選択中の${selectedBlocks.length}件を未割当に戻しますか？`)) {
    return
  }

  const previousData = data
  const blockIds = selectedBlocks.map((block) => block.block_id)

  try {
    setLoading(true)
    setError(null)

    let nextData = data

    for (const block of selectedBlocks) {
      nextData = moveBlockInCalendarData(nextData, block, {
        machineId: null,
        date: null,
        shiftCategory: null,
      })
    }

    setData(nextData)

    const res = await fetch("/api/schedule/blocks/unassign", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blockIds }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(body.error ?? "選択案件の未割当処理に失敗しました")
    }

    setSelectedAssignedBlockIds(new Set())
    await refreshDataSilently(baseDate)
  } catch (e) {
    setData(previousData)
    setError(e instanceof Error ? e.message : "選択案件の未割当処理に失敗しました")
  } finally {
    setLoading(false)
  }
}

  async function handleCancelUnassignedBlock(block: ScheduleBlockRow) {
  const label = `${block.order_number ?? ""} / ${block.product_name ?? block.unit_name ?? ""}`

  if (!confirm(`この未割当案件をリストから削除しますか？\n\n${label}`)) {
    return
  }

  try {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/schedule/block/${block.block_id}/cancel`, {
      method: "PATCH",
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(body.error ?? "未割当案件の削除に失敗しました")
    }

    setSelectedUnassignedBlockIds((prev) => {
      const next = new Set(prev)
      next.delete(block.block_id)
      return next
    })

    await loadData(baseDate)
  } catch (e) {
    setError(e instanceof Error ? e.message : "未割当案件の削除に失敗しました")
  } finally {
    setLoading(false)
  }
}

async function handleCancelSelectedUnassignedBlocks() {
  const blockIds = Array.from(selectedUnassignedBlockIds)

  if (blockIds.length === 0) return

  if (!confirm(`選択中の${blockIds.length}件を未割当リストから削除しますか？`)) {
    return
  }

  try {
    setLoading(true)
    setError(null)

    const res = await fetch("/api/schedule/blocks/cancel", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blockIds }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(body.error ?? "未割当案件の一括削除に失敗しました")
    }

    setSelectedUnassignedBlockIds(new Set())
    await loadData(baseDate)
  } catch (e) {
    setError(e instanceof Error ? e.message : "未割当案件の一括削除に失敗しました")
  } finally {
    setLoading(false)
  }
}

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
  className={`grid h-[calc(100vh-80px)] min-h-[820px] gap-0 overflow-hidden rounded-2xl border bg-white shadow-sm ${
    unassignedCollapsed ? "grid-cols-[48px_1fr]" : "grid-cols-[420px_1fr]"
  }`}
>
        <DroppableUnassignedArea active={!!draggingBlock && !!draggingBlock.machine_id}>
  {unassignedCollapsed ? (
    <aside className="flex h-full min-h-0 flex-col items-center border-r bg-slate-50 px-1 py-3">
      <button
        type="button"
        onClick={() => setUnassignedCollapsed(false)}
        className="rounded-md border bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100"
        title="未割当案件を表示"
      >
        開
      </button>

      <div className="mt-4 text-[11px] font-bold text-slate-500 [writing-mode:vertical-rl]">
        未割当
      </div>

      {filteredUnassigned.length > 0 ? (
        <div className="mt-4 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
          {filteredUnassigned.length}
        </div>
      ) : null}
    </aside>
  ) : (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r bg-white">
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">未割当案件</h2>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUnassignedCollapsed(true)}
          >
            閉じる
          </Button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索…"
            className="pl-9"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">フィルタ:</span>
          <Button
            variant={showUnassignedOnly ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowUnassignedOnly((v) => !v)}
          >
            未割当のみ
          </Button>
        </div>

        {selectedUnassignedCount > 0 ? (
          <div className="mt-3 rounded-md border border-blue-300 bg-blue-50 p-2 text-xs text-blue-900">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold">{selectedUnassignedCount}件選択中</div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearUnassignedSelection}
                >
                  選択解除
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleCancelSelectedUnassignedBlocks()}
                >
                  選択分を削除
                </Button>
              </div>
            </div>

            <div
              className="mt-1 truncate"
              title={selectedUnassignedBlocks
                .map((item) => item.product_name ?? item.unit_name)
                .join(" / ")}
            >
              {selectedUnassignedBlocks[0]?.unit_name} /{" "}
              {selectedUnassignedBlocks[0]?.product_name ?? "-"}
              {selectedUnassignedCount > 1
                ? ` ほか${selectedUnassignedCount - 1}件`
                : ""}
            </div>

            <div className="mt-1 text-[11px] text-blue-800">
              この状態で右の予定セルをクリックすると、選択した案件をまとめて割当できます。
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
            未割当案件を複数選択、またはドラッグして、右の予定セルに割当できます。
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain">
        {filteredUnassigned.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            未割当案件はありません。
          </div>
        ) : (
          <div className="divide-y">
            {filteredUnassigned.map((item) => (
              <DraggableBlock
                key={item.block_id}
                block={item}
                source="unassigned"
                selected={selectedUnassignedBlockIds.has(item.block_id)}
                onSelect={() => toggleUnassignedSelection(item)}
              >
                <UnassignedBlockCard
                  item={item}
                  selected={selectedUnassignedBlockIds.has(item.block_id)}
                  onCancel={() => handleCancelUnassignedBlock(item)}
                />
              </DraggableBlock>
            ))}
          </div>
        )}
      </div>
    </aside>
  )}
</DroppableUnassignedArea>

        <section className="flex min-w-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b p-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => goWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] text-center text-xl font-bold">{weekRangeLabel}</div>
              <Button variant="secondary" onClick={goCurrentWeek}>今週</Button>
              <Button variant="outline" size="icon" onClick={() => goWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={machineFilter} onValueChange={setMachineFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="全印刷機" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全印刷機</SelectItem>
                  {Array.from(new Map(data.machineRows.map((m) => [m.machine_id, m])).values()).map((m) => (
                    <SelectItem key={m.machine_id} value={m.machine_id}>
                      {m.machine_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
  variant="secondary"
  onClick={() => void handleImportLegacyData()}
  disabled={loading}
>
  基幹データ取込
</Button>

              <Button variant="outline" onClick={() => void loadData(baseDate)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                更新
              </Button>
            </div>
          </div>

          {error ? <div className="p-4 text-sm text-red-600">{error}</div> : null}

          <div
            ref={topScrollRef}
            onScroll={() => syncScroll("top")}
            className="h-5 overflow-x-auto overflow-y-hidden border-b bg-slate-50"
          >
            <div className={`h-1 ${scheduleTableMinWidth}`} />
          </div>

          <div
            ref={bodyScrollRef}
            onScroll={() => syncScroll("body")}
            className="relative flex-1 overflow-auto bg-white"
          >
            <table className={`${scheduleTableMinWidth} border-separate border-spacing-0 ${isMachineFocused ? "text-[12px]" : "text-[11px]"}`}>
              <thead className="bg-white">
                <tr>
                  <th
                    className={`sticky left-0 top-0 z-30 h-16 ${machineColumnWidth} border border-slate-300 bg-[#f7f7f7] px-3 py-3 text-left text-sm font-bold whitespace-nowrap shadow-[inset_-1px_0_0_#cbd5e1,inset_0_-1px_0_#cbd5e1,4px_0_6px_rgba(15,23,42,0.10)]`}
                  >
                    印刷機
                  </th>
                  {data.weekDays.map((day) => (
  <th
    key={day.date}
    className="sticky top-0 z-20 h-16 border border-slate-300 px-1 py-2 text-center font-bold shadow-[inset_0_-1px_0_#cbd5e1,inset_-1px_0_0_#cbd5e1]"
style={{
  minWidth: `${dayColumnWidthPx}px`,
  backgroundColor: getWeekdayHeaderColor(day.weekday),
}}
  >
    <div>{day.label}（{day.weekday}）</div>
  </th>
))}
                </tr>
              </thead>

              <tbody>
                {machineRows.map((row) => (
                  <tr key={`${row.machine_id}-${row.shift_category}`}>
                    <td
  className={`sticky left-0 z-10 ${machineColumnWidth} border border-slate-300 bg-white px-2 py-2 align-top font-bold whitespace-nowrap shadow-[inset_-1px_0_0_#cbd5e1,inset_0_-1px_0_#cbd5e1,4px_0_6px_rgba(15,23,42,0.08)]`}
  style={{ height: scheduleCellMinHeight }}
>
  <div className={`${isMachineFocused ? "text-[16px]" : "text-[13px]"} font-bold leading-tight`}>
  {row.machine_name}
</div>
<div className={`mt-1 ${isMachineFocused ? "text-[13px]" : "text-[12px]"} text-muted-foreground`}>
  {row.shift_label}
</div>
</td>

                    {data.weekDays.map((day) => {
                      const key = makeCellKey(row.machine_id, row.shift_category, day.date)
                      const cell = data.cells[key]

                      return (
                        <td
                          key={key}
                          className={`border border-slate-300 align-top p-0 ${
                            day.date === today ? "bg-sky-50/40" : "bg-white"
                          }`}
                        >
                          <DroppableScheduleCell
                            machineId={row.machine_id}
                            date={day.date}
                            shiftCategory={row.shift_category}
                            active={selectedUnassignedCount > 0 || !!draggingBlock}
                            minHeight={scheduleCellMinHeight}
                            onClick={() =>
                              handleAssignBlockToCell({
                                block: null,
                                machineId: row.machine_id,
                                date: day.date,
                                shiftCategory: row.shift_category,
                              })
                            }
                          >
                            {loading ? (
                              <div className="pt-6 text-center text-xs text-muted-foreground">読み込み中…</div>
                            ) : cell?.blocks.length ? (
                              <>
                                <div className="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-2 py-1">
  <div className="text-[11px] font-bold text-slate-700">
    {cell.blocks.length}件
    {cell.blocks.some((block) => selectedAssignedBlockIds.has(block.block_id)) ? (
      <span className="ml-2 text-blue-700">
        選択中 {
          cell.blocks.filter((block) => selectedAssignedBlockIds.has(block.block_id)).length
        }件
      </span>
    ) : null}
  </div>

  <div className="flex items-center gap-1">
    {cell.blocks.some((block) => selectedAssignedBlockIds.has(block.block_id)) ? (
      <>
        <button
          type="button"
          className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
          onClick={(e) => {
            e.stopPropagation()
            void handleUnassignSelectedAssignedBlocks(cell.blocks)
          }}
        >
          選択分を未割当へ
        </button>

        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
          onClick={(e) => {
            e.stopPropagation()
            clearAssignedSelection()
          }}
        >
          選択解除
        </button>
      </>
    ) : null}

    <button
      type="button"
      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100"
      onClick={(e) => {
        e.stopPropagation()
        void handleUnassignCellBlocks(cell.blocks)
      }}
    >
      このセルを未割当へ
    </button>
  </div>
</div>

<ScheduleCellHeader
  gridClass={scheduleCellGrid}
  focused={isMachineFocused}
/>

<div className="space-y-0">
  {cell.blocks.map((block, index) => (
    <DraggableBlock key={block.block_id} block={block} source="assigned">
      <ScheduleCellItem
  block={block}
  gridClass={scheduleCellGrid}
  focused={isMachineFocused}
  selected={selectedAssignedBlockIds.has(block.block_id)}
  canMoveUp={index > 0}
  canMoveDown={index < cell.blocks.length - 1}
  onMoveUp={() => handleMoveBlockOrder(block, "up")}
  onMoveDown={() => handleMoveBlockOrder(block, "down")}
  onClick={(event) => {
    if (event.ctrlKey || event.metaKey) {
      toggleAssignedSelection(block)
      return
    }

    setSelectedBlock(block)
  }}
  onToggleProgress={(field, checked) => handleToggleProgress(block, field, checked)}
  onSaveNote={(note) => handleSaveNote(block, note)}
/>
    </DraggableBlock>
  ))}
</div>
                              </>
                            ) : (
                              <div className="pt-6 text-center text-xs text-muted-foreground">-</div>
                            )}
                          </DroppableScheduleCell>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Dialog open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
          <DialogContent className="z-[100] max-w-3xl">
            <DialogHeader>
              <DialogTitle>案件詳細</DialogTitle>
            </DialogHeader>

            {selectedBlock ? (
              <>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                    <Info label="受注番号" value={getSafeOrderNumber(selectedBlock)} compact />
                    <Info label="品名" value={selectedBlock.product_name} compact strong />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Info label="得意先" value={selectedBlock.customer_name} />
                  <Info label="印刷単位" value={formatPrintUnitSummary(selectedBlock)} />
                  <Info label="版型" value={selectedBlock.plate_size} />
                  <Info label="色数" value={`${selectedBlock.color_front ?? "-"}/${selectedBlock.color_back ?? "-"}`} />
                  <Info label="色指定・備考" value={selectedBlock.color_note} />
                  <Info label="通紙" value={selectedBlock.print_count?.toLocaleString("ja-JP")} />
                  <Info label="特記" value={selectedBlock.block_note} />
                  <Info label="印刷機" value={selectedBlock.machine_name} />
                  <Info label="日付" value={selectedBlock.scheduled_date} />
                  <Info label="順番" value={selectedBlock.sequence_no ? String(selectedBlock.sequence_no) : null} />
                  <Info label="状態" value={getStatusLabel(selectedBlock.block_status)} />
                </div>

                <div className="mt-4 rounded-xl border bg-white p-4">
  <div className="mb-3 text-sm font-bold">作業記録</div>

  <div className="grid gap-3 md:grid-cols-3">
    <Info label="開始時刻" value={formatDateTimeJP(selectedBlock.actual_start_at)} />
    <Info label="停止時刻" value={formatDateTimeJP(selectedBlock.actual_end_at)} />
    <Info label="作業時間" value={formatWorkMinutes(selectedBlock.actual_work_minutes)} />
  </div>

  <div className="mt-4 flex flex-wrap justify-end gap-2">
    <Button
      type="button"
      variant="secondary"
      onClick={() => void handleWorkTimeAction(selectedBlock, "start")}
      disabled={!!selectedBlock.actual_start_at && !selectedBlock.actual_end_at}
    >
      作業開始
    </Button>

    <Button
      type="button"
      variant="secondary"
      onClick={() => void handleWorkTimeAction(selectedBlock, "stop")}
      disabled={!selectedBlock.actual_start_at || !!selectedBlock.actual_end_at}
    >
      作業停止
    </Button>

    <Button
      type="button"
      variant="outline"
      onClick={() => {
        if (confirm("作業時間をクリアしますか？")) {
          void handleWorkTimeAction(selectedBlock, "clear")
        }
      }}
      disabled={!selectedBlock.actual_start_at && !selectedBlock.actual_end_at}
    >
      クリア
    </Button>
  </div>
</div>

                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  この画面は、割当済み案件の内容確認と「未割当に戻す」操作用です。
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedBlock(null)}>
                    閉じる
                  </Button>

                  {selectedBlock.machine_id || selectedBlock.scheduled_date ? (
                    <Button type="button" variant="destructive" onClick={() => handleUnassignBlock(selectedBlock)}>
                      未割当に戻す
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      <DragOverlay>
        {draggingBlock ? <DragOverlayCard block={draggingBlock} count={selectedUnassignedBlockIds.has(draggingBlock.block_id) ? selectedUnassignedCount : 1} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function getWeekdayHeaderColor(weekday: string) {
  switch (weekday) {
    case "月":
      return "#f9e59d"
    case "火":
      return "#eea2e4"
    case "水":
      return "#b8d8aa"
    case "木":
      return "#f1b26d"
    case "金":
      return "#a8c2f3"
    case "土":
      return "#b4a6d5"
    case "日":
      return "#e59898"
    default:
      return "#f7f7f7"
  }
}

function updateBlockInCalendarData(
  current: WeeklyCalendarData,
  target: ScheduleBlockRow,
  patch: Partial<ScheduleBlockRow>,
  options?: { scope?: "block" | "print_item" },
): WeeklyCalendarData {
  const scope = options?.scope ?? "block"
  const isTarget = (b: ScheduleBlockRow) => {
    if (scope === "print_item") return b.print_item_id === target.print_item_id
    return b.block_id === target.block_id
  }

  const nextCells: Record<string, WeeklyCalendarCell> = {}

  for (const key of Object.keys(current.cells)) {
    nextCells[key] = {
      ...current.cells[key],
      blocks: current.cells[key].blocks.map((b) => (isTarget(b) ? { ...b, ...patch } : b)),
    }
  }

  const nextUnassignedBlocks = current.unassignedBlocks.map((b) =>
    isTarget(b) ? { ...b, ...patch } : b,
  )

  return { ...current, cells: nextCells, unassignedBlocks: nextUnassignedBlocks }
}

function swapBlockSequenceInCalendarData(
  current: WeeklyCalendarData,
  blockA: ScheduleBlockRow,
  blockB: ScheduleBlockRow,
  seqA: number,
  seqB: number,
): WeeklyCalendarData {
  const nextCells: Record<string, WeeklyCalendarCell> = {}

  for (const key of Object.keys(current.cells)) {
    const blocks = current.cells[key].blocks.map((b) => {
      if (b.block_id === blockA.block_id) return { ...b, sequence_no: seqB }
      if (b.block_id === blockB.block_id) return { ...b, sequence_no: seqA }
      return b
    })

    nextCells[key] = {
      ...current.cells[key],
      blocks: blocks.sort((a, b) => {
        const seqAValue = a.sequence_no ?? 9999
        const seqBValue = b.sequence_no ?? 9999
        if (seqAValue !== seqBValue) return seqAValue - seqBValue
        return a.unit_name.localeCompare(b.unit_name, "ja")
      }),
    }
  }

  return {
    ...current,
    cells: nextCells,
  }
}

function getNextSequenceNo(
  current: WeeklyCalendarData,
  machineId: string,
  shiftCategory: "day" | "night",
  date: string,
  movingBlockId?: string,
) {
  const key = makeCellKey(machineId, shiftCategory, date)
  const blocks = current.cells[key]?.blocks ?? []

  const maxSeq = blocks
    .filter((b) => b.block_id !== movingBlockId)
    .reduce((max, b) => Math.max(max, b.sequence_no ?? 0), 0)

  return maxSeq + 1
}

function moveBlockInCalendarData(
  current: WeeklyCalendarData,
  block: ScheduleBlockRow,
  target: {
    machineId: string | null
    date: string | null
    shiftCategory: "day" | "night" | null
    sequenceNo?: number | null
  },
): WeeklyCalendarData {
  const isUnassign = !target.machineId || !target.date || !target.shiftCategory

  const movedBlock: ScheduleBlockRow = {
    ...block,
    machine_id: target.machineId,
    scheduled_date: target.date,
    shift_category: target.shiftCategory,
    block_status: isUnassign ? "unassigned" : "assigned",
    unit_status: isUnassign ? "unassigned" : "assigned",
    sequence_no: isUnassign ? null : target.sequenceNo ?? block.sequence_no,
    machine_name: isUnassign ? null : block.machine_name,
    shift_label: target.shiftCategory === "day" ? "日勤" : target.shiftCategory === "night" ? "夜勤" : "",
    shift_sort_order: target.shiftCategory === "day" ? 1 : target.shiftCategory === "night" ? 2 : 99,
  }

  const nextCells: Record<string, WeeklyCalendarCell> = {}

  for (const key of Object.keys(current.cells)) {
    nextCells[key] = {
      ...current.cells[key],
      blocks: current.cells[key].blocks.filter((b) => b.block_id !== block.block_id),
    }
  }

  let nextUnassignedBlocks = current.unassignedBlocks.filter((b) => b.block_id !== block.block_id)

  if (isUnassign) {
    nextUnassignedBlocks = [movedBlock, ...nextUnassignedBlocks]
  } else {
    const key = makeCellKey(target.machineId!, target.shiftCategory!, target.date!)

    if (!nextCells[key]) {
      nextCells[key] = {
        machine_id: target.machineId!,
        shift_category: target.shiftCategory!,
        date: target.date!,
        blocks: [],
      }
    }

    const sortedBlocks = [...nextCells[key].blocks, movedBlock].sort((a, b) => {
      const seqA = a.sequence_no ?? 9999
      const seqB = b.sequence_no ?? 9999
      if (seqA !== seqB) return seqA - seqB
      return a.unit_name.localeCompare(b.unit_name, "ja")
    })

    nextCells[key] = {
      ...nextCells[key],
      blocks: sortedBlocks,
    }
  }

  return {
    ...current,
    cells: nextCells,
    unassignedBlocks: nextUnassignedBlocks,
  }
}

export function ScheduleCellHeader({
  gridClass = SCHEDULE_CELL_GRID,
  focused = false,
}: {
  gridClass?: string
  focused?: boolean
}) {
  return (
    <div
      className={`grid ${gridClass} border-b border-slate-400 bg-slate-100 ${
        focused ? "text-[11px]" : "text-[10px]"
      } font-medium`}
    >
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">順</div>
      <div className="border-r border-slate-300 px-1 py-0.5">受注</div>
      <div className="border-r border-slate-300 px-1 py-0.5">品名</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">DTP</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">紙</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">下版</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">PP</div>
      <div className="border-r border-slate-300 px-1 py-0.5">部品</div>
      <div className="border-r border-slate-300 px-1 py-0.5">サイズ</div>
      <div className="border-r border-slate-300 px-1 py-0.5">色数</div>
      <div className="border-r border-slate-300 px-1 py-0.5">色指定</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">特色</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-right">通紙</div>
      <div className="border-r border-slate-300 px-1 py-0.5">特記</div>
      <div className="border-r border-slate-300 px-1 py-0.5">作業時間</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">刷了</div>
    </div>
  )
}

export function ScheduleCellItem({
  block,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onClick,
  onToggleProgress,
  onSaveNote,
  gridClass = SCHEDULE_CELL_GRID,
  focused = false,
  selected = false,
}: {
  block: ScheduleBlockRow
  canMoveUp?: boolean
  canMoveDown?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void
  onToggleProgress?: (field: ProgressField, checked: boolean) => void
  onSaveNote?: (note: string) => void
  gridClass?: string
  focused?: boolean
  selected?: boolean
}) {
  const completed = !!block.printing_completed

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
      onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.stopPropagation()
  }
}}
      className={`block w-full cursor-pointer border-b border-slate-300 text-left text-[11px] ${
  completed
    ? "bg-[#b7b7b7]"
    : selected
      ? "bg-blue-200 ring-2 ring-inset ring-blue-600"
      : "bg-white hover:bg-slate-50"
}`}
    >
      <div
        className={`grid ${gridClass} border-b border-slate-300 ${
  focused ? "text-[12px]" : "text-[11px]"
} ${
  completed
    ? "bg-[#b7b7b7] text-slate-700 [&>*]:bg-[#b7b7b7]"
    : selected
      ? "bg-blue-200 text-slate-950 [&>*]:bg-blue-200"
      : "bg-white text-slate-900"
}`}
      >
        <OrderMoveCell
          canMoveUp={!!canMoveUp}
          canMoveDown={!!canMoveDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />

        <Cell className="font-medium">{block.order_number ?? "-"}</Cell>

        <Cell title={block.product_name ?? ""} className="truncate">
          {block.product_name ?? "-"}
        </Cell>

        <CheckCell
          checked={!!block.dtp_completed}
          completed={completed}
          onToggle={() =>
            onToggleProgress?.("dtp_completed", !block.dtp_completed)
          }
        />

        <CheckCell
          checked={!!block.paper_stacked}
          completed={completed}
          onToggle={() =>
            onToggleProgress?.("paper_stacked", !block.paper_stacked)
          }
        />

        <CheckCell
          checked={!!block.plate_completed}
          completed={completed}
          onToggle={() =>
            onToggleProgress?.("plate_completed", !block.plate_completed)
          }
        />

        <CheckCell
          checked={!!block.pp_processed}
          completed={completed}
          onToggle={() =>
            onToggleProgress?.("pp_processed", !block.pp_processed)
          }
        />

        <Cell className="truncate" title={block.unit_name}>
          {block.unit_name}
        </Cell>

        <Cell>{block.plate_size ?? "-"}</Cell>

        <Cell>{formatColorCount(block)}</Cell>

        <Cell title={formatSpecialColor(block)} className="truncate">
          {formatSpecialColor(block)}
        </Cell>

        <CheckCell
          checked={!!block.has_special_color}
          completed={completed}
          onToggle={() =>
            onToggleProgress?.("has_special_color", !block.has_special_color)
          }
        />

        <Cell className="justify-end text-right">
          {compactNumber(block.print_count)}
        </Cell>

        <NoteCell value={block.block_note} onSave={(value) => onSaveNote?.(value)} />

        <Cell
  className={
    completed
      ? "bg-[#b7b7b7] text-slate-600"
      : "bg-slate-50 text-slate-700"
  }
>
  {formatWorkMinutes(block.actual_work_minutes)}
</Cell>

        <CheckCell
          checked={!!block.printing_completed}
          completed={completed}
          onToggle={() =>
            onToggleProgress?.(
              "printing_completed",
              !block.printing_completed,
            )
          }
        />
      </div>
    </div>
  )
}

function OrderMoveCell({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-0.5 border-r border-slate-300 px-0.5 py-0.5">
      <button
        type="button"
        disabled={!canMoveUp}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onMoveUp?.()
        }}
        className={`h-4 w-4 border text-[10px] leading-none ${
          canMoveUp
            ? "border-slate-400 bg-white hover:bg-slate-100"
            : "border-slate-200 bg-slate-50 text-slate-300"
        }`}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={!canMoveDown}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onMoveDown?.()
        }}
        className={`h-4 w-4 border text-[10px] leading-none ${
          canMoveDown
            ? "border-slate-400 bg-white hover:bg-slate-100"
            : "border-slate-200 bg-slate-50 text-slate-300"
        }`}
      >
        ↓
      </button>
    </div>
  )
}

function DraggableBlock({
  block,
  source,
  selected = false,
  onSelect,
  children,
}: {
  block: ScheduleBlockRow
  source: DragBlockSource
  selected?: boolean
  onSelect?: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${source}:${block.block_id}`,
    data: {
      type: "schedule-block",
      source,
      block,
    } satisfies DragBlockData,
  })

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      className={`cursor-grab active:cursor-grabbing ${selected ? "bg-blue-50 ring-2 ring-blue-400" : ""}`}
    >
      {children}
    </div>
  )
}

function DroppableScheduleCell({
  machineId,
  date,
  shiftCategory,
  active,
  minHeight = SCHEDULE_CELL_MIN_HEIGHT,
  onClick,
  children,
}: {
  machineId: string
  date: string
  shiftCategory: "day" | "night"
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${machineId}:${shiftCategory}:${date}`,
    data: {
      type: "schedule-cell",
      machineId,
      date,
      shiftCategory,
    } satisfies ScheduleCellDropData,
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`relative ${
  active ? "cursor-copy" : ""
}`}
style={{ minHeight }}
    >
      {children}

      {active && !isOver ? (
        <div className="pointer-events-none absolute inset-0 z-10 ring-1 ring-inset ring-blue-200" />
      ) : null}

      {isOver ? (
        <div className="pointer-events-none absolute inset-0 z-20 bg-blue-300/20 ring-4 ring-inset ring-blue-500" />
      ) : null}
    </div>
  )
}

function DroppableUnassignedArea({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned-area",
    data: {
      type: "unassigned-area",
    } satisfies UnassignedDropData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`h-full min-h-0 overflow-hidden ${
  active ? "ring-2 ring-blue-300" : ""
} ${isOver ? "bg-blue-50 ring-4 ring-blue-400" : ""}`}
    >
      {children}
    </div>
  )
}

function DragOverlayCard({ block, count = 1 }: { block: ScheduleBlockRow; count?: number }) {
  return (
    <div className="w-[420px] rotate-1 border border-blue-400 bg-white shadow-2xl">
      {count > 1 ? (
        <div className="border-b border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-900">
          {count}件をまとめて移動
        </div>
      ) : null}
      {block.machine_id || block.scheduled_date ? (
        <div className="p-2 text-[11px]">
          <div className="font-bold">{block.order_number ?? "-"}</div>
          <div className="mt-1 truncate">{block.product_name ?? "-"}</div>
          <div className="mt-1 text-slate-600">{block.unit_name} / {compactNumber(block.print_count)}通紙</div>
        </div>
      ) : (
        <UnassignedBlockCard item={block} />
      )}
    </div>
  )
}

function UnassignedBlockCard({
  item,
  selected,
  onCancel,
}: {
  item: ScheduleBlockRow
  selected?: boolean
  onCancel?: () => void
}) {
  return (
    <div
      className={`border-b text-[12px] leading-tight transition-colors ${
        selected
          ? "border-blue-400 bg-blue-50 ring-2 ring-inset ring-blue-400"
          : "border-slate-400 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="grid grid-cols-[58px_1fr_42px] border-b border-slate-300">
        <div className="border-r border-slate-300 px-2 py-1 text-slate-700">
          品名
        </div>

        <div
          className="truncate px-2 py-1 font-bold"
          title={item.product_name ?? ""}
        >
          {item.product_name ?? "-"}
        </div>

        <button
          type="button"
          className="border-l border-slate-300 px-1 py-1 text-[11px] text-red-600 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation()
            onCancel?.()
          }}
          title="未割当リストから削除"
        >
          削除
        </button>
      </div>

      <div className="grid grid-cols-[58px_1fr_58px_1fr] border-b border-slate-300">
        <div className="border-r border-slate-300 px-2 py-1 text-slate-700">受注</div>
        <div className="border-r border-slate-300 px-2 py-1">{item.order_number ?? "-"}</div>
        <div className="border-r border-slate-300 px-2 py-1 text-slate-700">部品</div>
        <div className="px-2 py-1">{item.unit_name ?? "-"}</div>
      </div>

      <div className="grid grid-cols-[58px_1fr_58px_1fr] border-b border-slate-300">
        <div className="border-r border-slate-300 px-2 py-1 text-slate-700">色数</div>
        <div className="border-r border-slate-300 px-2 py-1">{formatColorCount(item)}</div>
        <div className="border-r border-slate-300 px-2 py-1 text-slate-700">色指定</div>
        <div className="truncate px-2 py-1" title={item.color_note ?? ""}>
          {formatSpecialColor(item)}
        </div>
      </div>

      <div className="grid grid-cols-[58px_1fr_58px_1fr]">
        <div className="border-r border-slate-300 px-2 py-1 text-slate-700">版型</div>
        <div className="border-r border-slate-300 px-2 py-1">{item.plate_size ?? "-"}</div>
        <div className="border-r border-slate-300 px-2 py-1 text-slate-700">通紙</div>
        <div className="px-2 py-1">{compactNumber(item.print_count)}</div>
      </div>
    </div>
  )
}

function Cell({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <div title={title} className={`flex items-center border-r border-slate-300 px-1 py-0.5 ${className}`}>
      {children}
    </div>
  )
}

function NoteCell({
  value,
  onSave,
}: {
  value?: string | null
  onSave?: (value: string) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState(value ?? "")

  React.useEffect(() => {
    setText(value ?? "")
  }, [value])

  const save = () => {
    setEditing(false)
    onSave?.(text)
  }

  if (editing) {
    return (
      <div className="border-r border-slate-300 bg-white px-1 py-0.5">
        <input
          autoFocus
          value={text}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === "Enter") save()
            if (e.key === "Escape") {
              setText(value ?? "")
              setEditing(false)
            }
          }}
          className="h-5 w-full border border-slate-300 px-1 text-[11px] outline-none"
        />
      </div>
    )
  }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      className="flex items-center border-r border-slate-300 bg-slate-50 px-1 py-0.5 text-slate-700"
      title={value ?? ""}
    >
      <span className="truncate">{value || "-"}</span>
    </div>
  )
}

function CheckCell({
  checked,
  completed,
  onToggle,
}: {
  checked: boolean
  completed?: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className={`flex items-center justify-center border-r border-slate-300 px-1 py-0.5 ${
        completed ? "bg-[#b7b7b7]" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className={`h-4 w-4 ${
          completed ? "opacity-60 accent-slate-500" : "accent-slate-900"
        }`}
      />
    </div>
  )
}


function formatPrintUnitSummary(block: ScheduleBlockRow) {
  const partName = block.part_name?.trim() || null
  const unitName = block.unit_name?.trim() || null
  const pressCount = Number.isFinite(block.press_count) ? block.press_count : null

  const unitNo = unitName?.match(/-(\d+)$/)?.[1] ?? null

  if (partName && pressCount && unitNo) {
    return `${partName}　${pressCount}台中 ${unitNo}台目`
  }

  if (unitName && partName && pressCount) {
    return `${unitName}（${partName}／全${pressCount}台）`
  }

  if (unitName && partName) {
    return `${unitName}（${partName}）`
  }

  return unitName || partName || null
}

function getSafeOrderNumber(block: ScheduleBlockRow) {
  const value = block.order_number?.trim()

  // まれにAPI側の取得結果で order_number にヘッダー文字列が混入した場合、
  // 画面上で「印刷機」などを受注番号として表示しないための保険です。
  if (!value || ["印刷機", "日勤", "夜勤"].includes(value)) return null

  return value
}

function Info({
  label,
  value,
  compact = false,
  strong = false,
}: {
  label: string
  value?: string | null
  compact?: boolean
  strong?: boolean
}) {
  return (
    <div className={`rounded-lg border bg-white ${compact ? "p-2.5" : "p-3"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words ${strong ? "text-base font-bold" : "text-sm font-medium"}`}>
        {value || "-"}
      </div>
    </div>
  )
}
