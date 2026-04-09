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
  block_status: "unassigned" | "tentative" | "assigned" | "confirmed" | "completed"

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