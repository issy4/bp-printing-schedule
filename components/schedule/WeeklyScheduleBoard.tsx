"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

export type ShiftCategory = "day" | "night" | null;

export type ScheduleBlockRow = {
  block_id: string;
  print_unit_id: string;
  block_no: number;
  scheduled_date: string | null;
  machine_id: string | null;
  shift_category: ShiftCategory;
  shift_label: string;
  shift_sort_order: number;
  sequence_no: number | null;
  planned_print_count: number | null;
  block_note: string | null;
  block_status:
  | "unassigned"
  | "tentative"
  | "assigned"
  | "confirmed"
  | "completed";
  machine_name: string | null;
  manufacturer: string | null;
  machine_type: string | null;
  sheet_group: string | null;
  perfecting_type: string | null;
  display_order: number | null;
  machine_is_active: boolean | null;
  machine_shift_name: string;
  print_unit_id_ref: string;
  print_item_id: string;
  unit_no: number;
  unit_name: string;
  assigned_machine_id: string | null;
  unit_status: "unassigned" | "assigned" | "confirmed" | "completed";
  print_item_id_ref: string;
  order_entry_id: string;
  source_file_id: string | null;
  part_name: string;
  default_machine_id: string | null;
  plate_size: string | null;
  color_front: number | null;
  color_back: number | null;
  color_note: string | null;
  print_count: number | null;
  press_count: number;
  imposition: string | null;
  page_count: number | null;
  fold_count: number | null;
  print_item_note: string | null;
  dtp_completed: boolean | null;
  paper_stacked: boolean | null;
  plate_completed: boolean | null;
  pp_processed: boolean | null;
  printing_completed: boolean | null;
  order_number: string | null;
  customer_code: string | null;
  customer_name: string | null;
  product_name: string | null;
  sales_user_code: string | null;
  order_date: string | null;
  source_file_name: string | null;
  source_file_url: string | null;
  source_file_type: string | null;
  source_file_is_instruction: boolean | null;
  source_file_parsed_status: string | null;
  source_file_version_no: number | null;
  source_file_is_latest: boolean | null;
};

export type MachineRow = {
  machine_id: string;
  machine_name: string;
  display_order: number;
  shift_category: "day" | "night";
  shift_label: "日勤" | "夜勤";
  machine_shift_name: string;
};

export type WeekDay = {
  date: string;
  label: string;
  weekday: string;
};

export type WeeklyCalendarCell = {
  machine_id: string;
  shift_category: "day" | "night";
  date: string;
  blocks: ScheduleBlockRow[];
};

export type WeeklyCalendarData = {
  weekDays: WeekDay[];
  machineRows: MachineRow[];
  cells: Record<string, WeeklyCalendarCell>;
  unassignedBlocks: ScheduleBlockRow[];
};

type WeeklyScheduleBoardProps = {
  initialData?: WeeklyCalendarData;
  initialBaseDate?: string;
};

function formatDateJP(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getWeekdayJP(dateStr: string) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return weekdays[new Date(dateStr).getDay()];
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildWeekDaysFromBase(baseDate?: string): WeekDay[] {
  const base = baseDate ? new Date(baseDate) : new Date();
  const start = startOfWeek(base);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = formatYmd(d);
    return {
      date,
      label: formatDateJP(date),
      weekday: getWeekdayJP(date),
    };
  });
}

function makeCellKey(machineId: string, shiftCategory: string, date: string) {
  return `${machineId}__${shiftCategory}__${date}`;
}

function compactNumber(value: number | null) {
  if (value == null) return "-";
  return value.toLocaleString("ja-JP");
}

function formatColorCount(item: ScheduleBlockRow) {
  const front = item.color_front != null ? item.color_front : "-"
  const back = item.color_back != null ? item.color_back : "-"
  return `${front}/${back}`
}

function formatSpecialColor(item: ScheduleBlockRow) {
  if (item.color_note && item.color_note.trim() !== "") {
    return item.color_note
  }
  return "-"
}

function getStatusLabel(status: ScheduleBlockRow["block_status"]) {
  switch (status) {
    case "unassigned":
      return "未割当";
    case "tentative":
      return "仮";
    case "assigned":
      return "割当済";
    case "confirmed":
      return "確定";
    case "completed":
      return "完了";
  }
}

function buildEmptyData(baseDate?: string): WeeklyCalendarData {
  const weekDays = buildWeekDaysFromBase(baseDate);
  const machines = [
    { machine_id: "7", machine_name: "7号機", display_order: 1 },
    { machine_id: "8", machine_name: "8号機", display_order: 2 },
    { machine_id: "10", machine_name: "10号機", display_order: 3 },
    { machine_id: "jp", machine_name: "JP", display_order: 4 },
    { machine_id: "outside", machine_name: "外注", display_order: 5 },
  ];

  const machineRows: MachineRow[] = machines.flatMap((m) => [
    {
      machine_id: m.machine_id,
      machine_name: m.machine_name,
      display_order: m.display_order,
      shift_category: "day",
      shift_label: "日勤",
      machine_shift_name: `${m.machine_name} 日勤`,
    },
    {
      machine_id: m.machine_id,
      machine_name: m.machine_name,
      display_order: m.display_order,
      shift_category: "night",
      shift_label: "夜勤",
      machine_shift_name: `${m.machine_name} 夜勤`,
    },
  ]);

  const cells: Record<string, WeeklyCalendarCell> = {};
  machineRows.forEach((row) => {
    weekDays.forEach((day) => {
      const key = makeCellKey(row.machine_id, row.shift_category, day.date);
      cells[key] = {
        machine_id: row.machine_id,
        shift_category: row.shift_category,
        date: day.date,
        blocks: [],
      };
    });
  });

  return {
    weekDays,
    machineRows,
    cells,
    unassignedBlocks: [],
  };
}

async function fetchWeeklyCalendarData(baseDate?: string): Promise<WeeklyCalendarData> {
  const qs = new URLSearchParams();
  if (baseDate) qs.set("date", baseDate);
  const res = await fetch(`/api/schedule/weekly?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "週間予定データの取得に失敗しました");
  }

  return res.json();
}

export default function WeeklyScheduleBoard({
  initialData,
  initialBaseDate,
}: WeeklyScheduleBoardProps) {
  const [baseDate, setBaseDate] = React.useState<string>(
    initialBaseDate ?? formatYmd(new Date()),
  );
  const [data, setData] = React.useState<WeeklyCalendarData>(
    initialData ?? buildEmptyData(initialBaseDate),
  );
  const [loading, setLoading] = React.useState(!initialData);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = React.useState(true);
  const [machineFilter, setMachineFilter] = React.useState<string>("all");
  const [selectedBlock, setSelectedBlock] = React.useState<ScheduleBlockRow | null>(null);

  const loadData = React.useCallback(async (date?: string) => {
    try {
      setLoading(true);
      setError(null);
      const next = await fetchWeeklyCalendarData(date ?? baseDate);
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [baseDate]);

  React.useEffect(() => {
    if (!initialData) {
      void loadData(baseDate);
    }
  }, [initialData, baseDate, loadData]);

  const weekRangeLabel = React.useMemo(() => {
    const days = data.weekDays;
    if (!days.length) return "";
    return `${days[0].label} ～ ${days[days.length - 1].label}`;
  }, [data.weekDays]);

  const filteredUnassigned = React.useMemo(() => {
    const q = query.trim().toLowerCase();
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
        .toLowerCase();
      if (!showUnassignedOnly) return !q || haystack.includes(q);
      return (!item.machine_id || !item.scheduled_date) && (!q || haystack.includes(q));
    });
  }, [data.unassignedBlocks, query, showUnassignedOnly]);

  const machineRows = React.useMemo(() => {
    return data.machineRows.filter((row) => {
      if (machineFilter === "all") return true;
      return row.machine_id === machineFilter;
    });
  }, [data.machineRows, machineFilter]);

  const today = formatYmd(new Date());

  const goWeek = (direction: -1 | 1) => {
    const base = new Date(baseDate);
    base.setDate(base.getDate() + direction * 7);
    const next = formatYmd(base);
    setBaseDate(next);
    void loadData(next);
  };

  const goCurrentWeek = () => {
    const next = formatYmd(new Date());
    setBaseDate(next);
    void loadData(next);
  };

  return (
    <div className="grid h-full min-h-[760px] grid-cols-[420px_1fr] gap-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <aside className="flex h-full flex-col border-r bg-white">
        <div className="border-b p-4">
          <h2 className="text-lg font-bold tracking-tight">未割当案件</h2>
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
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUnassigned.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">未割当案件はありません。</div>
          ) : (
            <div className="divide-y">
              {filteredUnassigned.map((item) => (
                <button
                  key={item.block_id}
                  type="button"
                  className="w-full p-0 text-left hover:bg-slate-50"
                  onClick={() => setSelectedBlock(item)}
                >
                  <div className="border-b border-slate-400 bg-white text-[12px] leading-tight">
                    {/* 1段目 */}
                    <div className="grid grid-cols-[1fr_84px] border-b border-slate-300">
                      <div
                        className="truncate px-2 py-1 font-bold"
                        title={item.product_name ?? ""}
                      >
                        {item.product_name ?? "-"}
                      </div>
                      <div className="border-l border-slate-300 px-2 py-1 text-center font-bold">
                        詳細
                      </div>
                    </div>

                    {/* 2段目 */}
                    <div className="grid grid-cols-[58px_1fr_58px_1fr] border-b border-slate-300">
                      <div className="border-r border-slate-300 px-2 py-1 text-slate-700">
                        受注
                      </div>
                      <div className="border-r border-slate-300 px-2 py-1">
                        {item.order_number ?? "-"}
                      </div>
                      <div className="border-r border-slate-300 px-2 py-1 text-slate-700">
                        部品
                      </div>
                      <div className="px-2 py-1">
                        {item.unit_name ?? "-"}
                      </div>
                    </div>

                    {/* 3段目 */}
                    <div className="grid grid-cols-[58px_1fr_58px_1fr] border-b border-slate-300">
                      <div className="border-r border-slate-300 px-2 py-1 text-slate-700">
                        色数
                      </div>
                      <div className="border-r border-slate-300 px-2 py-1">
                        {formatColorCount(item)}
                      </div>
                      <div className="border-r border-slate-300 px-2 py-1 text-slate-700">
                        特色
                      </div>
                      <div
                        className="truncate px-2 py-1"
                        title={item.color_note ?? ""}
                      >
                        {formatSpecialColor(item)}
                      </div>
                    </div>

                    {/* 4段目 */}
                    <div className="grid grid-cols-[58px_1fr_58px_1fr]">
                      <div className="border-r border-slate-300 px-2 py-1 text-slate-700">
                        版型
                      </div>
                      <div className="border-r border-slate-300 px-2 py-1">
                        {item.plate_size ?? "-"}
                      </div>
                      <div className="border-r border-slate-300 px-2 py-1 text-slate-700">
                        通紙
                      </div>
                      <div className="px-2 py-1">
                        {compactNumber(item.print_count)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

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
            <Button variant="outline" onClick={() => void loadData(baseDate)}>
              <RefreshCw className="mr-2 h-4 w-4" />更新
            </Button>
          </div>
        </div>

        {error ? <div className="p-4 text-sm text-red-600">{error}</div> : null}

        <div className="flex-1 overflow-auto">
          <table className="min-w-[1800px] border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th className="sticky left-0 z-30 border border-slate-300 bg-[#f7f7f7] px-1 py-1 text-left font-bold whitespace-nowrap">
                  印刷機
                </th>
                {data.weekDays.map((day) => (
                  <th
                    key={day.date}
                    className={`border border-slate-300 px-1 py-1 text-center font-bold min-w-[220px] ${day.date === today ? "bg-sky-50" : "bg-[#f7f7f7]"}`}
                  >
                    <div>{day.label}({day.weekday})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {machineRows.map((row) => (
                <tr key={`${row.machine_id}-${row.shift_category}`}>
                  <td className="sticky left-0 z-10 border border-slate-300 bg-white px-1 py-1 align-top font-bold whitespace-nowrap">
                    <div>{row.machine_name}</div>
                    <div className="text-[10px] text-muted-foreground">{row.shift_label}</div>
                  </td>

                  {data.weekDays.map((day) => {
                    const key = makeCellKey(row.machine_id, row.shift_category, day.date);
                    const cell = data.cells[key];
                    return (
                      <td
                        key={key}
                        className={`border border-slate-300 align-top p-0 ${day.date === today ? "bg-sky-50/40" : "bg-white"}`}
                      >
                        <div className="min-h-[92px] space-y-[1px] bg-white">
                          {loading ? (
                            <div className="pt-6 text-center text-xs text-muted-foreground">読み込み中…</div>
                          ) : cell?.blocks.length ? (
                            cell.blocks.map((block) => (
                              <ScheduleCellItem
                                key={block.block_id}
                                block={block}
                                onClick={() => setSelectedBlock(block)}
                              />
                            ))
                          ) : (
                            <div className="pt-6 text-center text-xs text-muted-foreground">-</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>案件詳細</DialogTitle>
          </DialogHeader>

          {selectedBlock ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="受注番号" value={selectedBlock.order_number} />
              <Info label="品名" value={selectedBlock.product_name} />
              <Info label="得意先" value={selectedBlock.customer_name} />
              <Info label="部品" value={selectedBlock.part_name} />
              <Info label="ユニット" value={selectedBlock.unit_name} />
              <Info label="版型" value={selectedBlock.plate_size} />
              <Info label="色数" value={`${selectedBlock.color_front ?? "-"}/${selectedBlock.color_back ?? "-"}`} />
              <Info label="色指定・備考" value={selectedBlock.color_note} />
              <Info label="通紙" value={selectedBlock.print_count?.toLocaleString("ja-JP")} />
              <Info label="台数" value={String(selectedBlock.press_count)} />
              <Info label="印刷機" value={selectedBlock.machine_name} />
              <Info label="日付" value={selectedBlock.scheduled_date} />
              <Info label="順番" value={selectedBlock.sequence_no ? String(selectedBlock.sequence_no) : null} />
              <Info label="状態" value={getStatusLabel(selectedBlock.block_status)} />
              <Info label="元ファイル" value={selectedBlock.source_file_name} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatColorCount(item: ScheduleBlockRow) {
  const front = item.color_front != null ? item.color_front : "-"
  const back = item.color_back != null ? item.color_back : "-"
  return `${front}/${back}`
}

export function ScheduleCellHeader() {
  return (
    <div className="grid grid-cols-[72px_1fr_34px_34px_34px_34px_34px_90px_58px_52px_70px] border-b border-slate-400 bg-slate-100 text-[10px] font-medium">
      <div className="border-r border-slate-300 px-1 py-0.5">受注</div>
      <div className="border-r border-slate-300 px-1 py-0.5">品名</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">DTP</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">紙</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">下版</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">PP</div>
      <div className="border-r border-slate-300 px-1 py-0.5 text-center">刷了</div>
      <div className="border-r border-slate-300 px-1 py-0.5">部品</div>
      <div className="border-r border-slate-300 px-1 py-0.5">版型</div>
      <div className="border-r border-slate-300 px-1 py-0.5">色数</div>
      <div className="px-1 py-0.5">通紙</div>
    </div>
  )
}

export function ScheduleCellItem({
  block,
  onClick,
}: {
  block: ScheduleBlockRow
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full border-b border-slate-300 bg-white text-left text-[11px] hover:bg-slate-50"
    >
      <div className="grid min-h-[28px] grid-cols-[72px_1fr_34px_34px_34px_34px_34px_90px_58px_52px_70px] items-stretch">
        <Cell className="font-medium">{block.order_number ?? "-"}</Cell>

        <Cell title={block.product_name ?? ""} className="truncate">
          {block.product_name ?? "-"}
        </Cell>

        <CheckCell checked={!!block.dtp_completed} />
        <CheckCell checked={!!block.paper_stacked} />
        <CheckCell checked={!!block.plate_completed} />
        <CheckCell checked={!!block.pp_processed} />
        <CheckCell checked={!!block.printing_completed} />

        <Cell className="truncate" title={block.unit_name}>
          {block.unit_name}
        </Cell>

        <Cell>{block.plate_size ?? "-"}</Cell>

        <Cell>{formatColorCount(block)}</Cell>

        <Cell className="justify-end text-right">
          {compactNumber(block.print_count)}
        </Cell>
      </div>
    </button>
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
    <div
      title={title}
      className={`flex items-center border-r border-slate-300 px-1 py-0.5 ${className}`}
    >
      {children}
    </div>
  )
}

function CheckCell({ checked }: { checked: boolean }) {
  return (
    <div className="flex items-center justify-center border-r border-slate-300 px-1 py-0.5">
      <span
        className={`inline-flex h-4 w-4 items-center justify-center border text-[10px] ${checked
            ? "border-slate-800 bg-slate-800 text-white"
            : "border-slate-400 bg-white text-transparent"
          }`}
      >
        ✓
      </span>
    </div>
  )
}

function CheckMini({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <div className="border-r border-slate-200 last:border-r-0 px-0.5 py-0.5">
      <div className="text-[9px] text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-center justify-center">
        <span
          className={`inline-flex h-3 w-3 items-center justify-center border text-[9px] ${checked ? "border-slate-700 bg-slate-700 text-white" : "border-slate-400 bg-white"
            }`}
        >
          {checked ? "✓" : ""}
        </span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium break-words">{value || "-"}</div>
    </div>
  );
}
