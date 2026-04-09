'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Search, Menu } from 'lucide-react'

// ダミーデータ定義
const SAMPLE_UNASSIGNED_JOBS = [
  {
    id: '1',
    unit_name: '本文1-1',
    part_name: '本文1',
    order_number: 'ORD-2024-001',
    product_name: 'A4チラシ（表）',
    customer_name: '山田商事',
    plate_size: 'A4',
    color_front: '4',
    color_back: '1',
    color_note: 'CMYK',
    print_count: 5000,
    press_count: 1,
    source_file_name: 'A4chirashi_v2.pdf',
    status: 'unassigned'
  },
  {
    id: '2',
    unit_name: '本文2-1',
    part_name: '本文2',
    order_number: 'ORD-2024-002',
    product_name: 'B5パンフレット（内側）',
    customer_name: '太郎印刷',
    plate_size: 'B5',
    color_front: '4',
    color_back: '4',
    color_note: 'CMYK',
    print_count: 3000,
    press_count: 2,
    source_file_name: 'B5pamph_v1.pdf',
    status: 'unassigned'
  },
  {
    id: '3',
    unit_name: 'カバー1-1',
    part_name: 'カバー1',
    order_number: 'ORD-2024-003',
    product_name: '雑誌表紙',
    customer_name: '国際出版',
    plate_size: 'B4',
    color_front: '4',
    color_back: '0',
    color_note: 'CMYK',
    print_count: 2000,
    press_count: 1,
    source_file_name: 'magazine_cover.pdf',
    status: 'unassigned'
  },
  {
    id: '4',
    unit_name: 'ハガキ1-1',
    part_name: 'ハガキ1',
    order_number: 'ORD-2024-004',
    product_name: '定期はがき',
    customer_name: 'ABC銀行',
    plate_size: 'ハガキ',
    color_front: '2',
    color_back: '1',
    color_note: 'K+1',
    print_count: 10000,
    press_count: 1,
    source_file_name: 'hagaki_bank.pdf',
    status: 'unassigned'
  }
]

const SAMPLE_SCHEDULED_JOBS = [
  {
    id: '101',
    unit_name: '本文1-2',
    part_name: '本文1',
    order_number: 'ORD-2024-001',
    product_name: 'A4チラシ（裏）',
    customer_name: '山田商事',
    plate_size: 'A4',
    color_front: '4',
    color_back: '1',
    color_note: 'CMYK',
    print_count: 5000,
    press_count: 1,
    machine_name: '7号機',
    scheduled_date: '2024-04-08',
    sequence_no: 1,
    status: 'confirmed',
    source_file_name: 'A4chirashi_v2_back.pdf'
  },
  {
    id: '102',
    unit_name: 'ラベル1-1',
    part_name: 'ラベル1',
    order_number: 'ORD-2024-005',
    product_name: '商品ラベル',
    customer_name: '商品企画社',
    plate_size: 'A3',
    color_front: '4',
    color_back: '0',
    color_note: 'CMYK',
    print_count: 8000,
    press_count: 2,
    machine_name: '7号機',
    scheduled_date: '2024-04-08',
    sequence_no: 2,
    status: 'assigned',
    source_file_name: 'label_v3.pdf'
  },
  {
    id: '103',
    unit_name: '本文3-1',
    part_name: '本文3',
    order_number: 'ORD-2024-006',
    product_name: 'カタログ本文',
    customer_name: 'メカニカル社',
    plate_size: 'B4',
    color_front: '4',
    color_back: '4',
    color_note: 'CMYK',
    print_count: 1500,
    press_count: 1,
    machine_name: '8号機',
    scheduled_date: '2024-04-09',
    sequence_no: 1,
    status: 'confirmed',
    source_file_name: 'catalog_body.pdf'
  },
  {
    id: '104',
    unit_name: '本文3-2',
    part_name: '本文3',
    order_number: 'ORD-2024-006',
    product_name: 'カタログ本文',
    customer_name: 'メカニカル社',
    plate_size: 'B4',
    color_front: '4',
    color_back: '4',
    color_note: 'CMYK',
    print_count: 1500,
    press_count: 1,
    machine_name: '8号機',
    scheduled_date: '2024-04-09',
    sequence_no: 2,
    status: 'confirmed',
    source_file_name: 'catalog_body2.pdf'
  },
  {
    id: '105',
    unit_name: 'パッケージ1-1',
    part_name: 'パッケージ1',
    order_number: 'ORD-2024-007',
    product_name: 'パッケージ',
    customer_name: '化粧品販売',
    plate_size: 'A4',
    color_front: '4',
    color_back: '2',
    color_note: 'CMYK+PP',
    print_count: 4000,
    press_count: 2,
    machine_name: '10号機',
    scheduled_date: '2024-04-08',
    sequence_no: 1,
    status: 'assigned',
    source_file_name: 'package_cosmetic.pdf'
  }
]

const MACHINES = ['7号機', '8号機', '10号機', 'JP', '外注']

// 日付ユーティリティ
function getWeekDates(baseDate = new Date()): Date[] {
  const dates: Date[] = []
  const current = new Date(baseDate)
  const dayOfWeek = current.getDay()
  const diff = current.getDate() - dayOfWeek
  const monday = new Date(current.setDate(diff))

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }
  return dates
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

function getDayOfWeek(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return days[date.getDay()]
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// 案件カード コンポーネント
interface JobCardProps {
  job: any
  onClick?: () => void
}

function JobCard({ job, onClick }: JobCardProps) {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 border-blue-300 text-blue-900',
    assigned: 'bg-amber-50 border-amber-200 text-amber-900',
    unassigned: 'bg-gray-50 border-gray-200 text-gray-900'
  }

  const statusLabels: Record<string, string> = {
    confirmed: '確定',
    assigned: '割当中',
    unassigned: '未割当'
  }

  return (
    <div
      onClick={onClick}
      className={`p-2 rounded border cursor-pointer text-xs transition-shadow hover:shadow-md ${statusColors[job.status] || statusColors.unassigned}`}
    >
      <div className="font-semibold truncate" title={job.unit_name}>
        {job.unit_name}
      </div>
      <div className="text-xs opacity-75 truncate" title={job.order_number}>
        {job.order_number}
      </div>
      <div className="text-xs opacity-75 truncate" title={job.product_name}>
        {job.product_name.length > 15 ? `${job.product_name.substring(0, 15)}…` : job.product_name}
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs">
          {job.color_front}/{job.color_back}色
        </span>
        <Badge variant="outline" className="text-xs">
          {statusLabels[job.status] || '未割当'}
        </Badge>
      </div>
    </div>
  )
}

// 詳細モーダル コンポーネント
interface DetailModalProps {
  job: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DetailModal({ job, open, onOpenChange }: DetailModalProps) {
  const [editingJob, setEditingJob] = useState(job)

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>案件詳細 - {job.unit_name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">受注番号</label>
            <p className="text-sm">{job.order_number}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">品名</label>
            <p className="text-sm">{job.product_name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">得意先名</label>
            <p className="text-sm">{job.customer_name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">部品名</label>
            <p className="text-sm">{job.part_name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">ユニット名</label>
            <p className="text-sm">{job.unit_name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">版型</label>
            <p className="text-sm">{job.plate_size}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">色数（表）</label>
            <p className="text-sm">{job.color_front}色</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">色数（裏）</label>
            <p className="text-sm">{job.color_back}色</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">通紙数</label>
            <p className="text-sm">{job.print_count.toLocaleString()}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">スクリーン数</label>
            <p className="text-sm">{job.press_count}</p>
          </div>
          {job.machine_name && (
            <div>
              <label className="text-xs font-semibold text-gray-600">印刷機</label>
              <p className="text-sm">{job.machine_name}</p>
            </div>
          )}
          {job.scheduled_date && (
            <div>
              <label className="text-xs font-semibold text-gray-600">予定日</label>
              <p className="text-sm">{job.scheduled_date}</p>
            </div>
          )}
          {job.sequence_no !== undefined && (
            <div>
              <label className="text-xs font-semibold text-gray-600">順番</label>
              <p className="text-sm">{job.sequence_no}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-600">ステータス</label>
            <p className="text-sm">{job.status}</p>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600">ソースファイル</label>
            <p className="text-sm">{job.source_file_name}</p>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-3 text-sm">編集</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">印刷機</label>
              <select className="w-full px-2 py-1 border rounded text-sm">
                <option>7号機</option>
                <option>8号機</option>
                <option>10号機</option>
                <option>JP</option>
                <option>外注</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">予定日</label>
              <Input type="date" className="text-sm h-8" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">順番</label>
              <Input type="number" defaultValue={1} className="text-sm h-8" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">ステータス</label>
              <select className="w-full px-2 py-1 border rounded text-sm">
                <option>unassigned</option>
                <option>assigned</option>
                <option>confirmed</option>
              </select>
            </div>
          </div>
          <Button className="w-full mt-4 h-8 text-sm">保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// メインコンポーネント
export default function PrintingSchedule() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [searchUnassigned, setSearchUnassigned] = useState('')
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false)
  const [filterMachine, setFilterMachine] = useState('all')

  const weekDates = getWeekDates(new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000))
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  // 未割当案件のフィルタリング
  const filteredUnassigned = SAMPLE_UNASSIGNED_JOBS.filter(job =>
    job.unit_name.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
    job.order_number.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
    job.product_name.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
    job.customer_name.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
    job.part_name.toLowerCase().includes(searchUnassigned.toLowerCase()) ||
    job.plate_size.toLowerCase().includes(searchUnassigned.toLowerCase())
  )

  // 予定表データの取得
  const getJobsForCell = (machine: string, date: string) => {
    return SAMPLE_SCHEDULED_JOBS.filter(
      job => job.machine_name === machine && job.scheduled_date === date
    ).sort((a, b) => (a.sequence_no || 0) - (b.sequence_no || 0))
  }

  const handleJobClick = (job: any) => {
    setSelectedJob(job)
    setDetailOpen(true)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左パネル - 未割当案件 */}
      <div className="w-1/4 border-r border-gray-300 bg-white flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-200">
          <h2 className="text-sm font-bold mb-3">未割当案件</h2>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="検索..."
                value={searchUnassigned}
                onChange={e => setSearchUnassigned(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div className="text-xs text-gray-600 mb-2">フィルタ:</div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
            >
              {showUnassignedOnly ? '✓ ' : ''}未割当のみ
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-100">
            {filteredUnassigned.map(job => (
              <div
                key={job.id}
                className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{job.unit_name}</div>
                    <div className="text-gray-600 truncate" title={job.part_name}>
                      {job.part_name}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleJobClick(job)}
                  >
                    詳細
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mb-1">
                  <div>受注: {job.order_number}</div>
                  <div>品名: {job.product_name.substring(0, 12)}</div>
                  <div>得意先: {job.customer_name}</div>
                  <div>版型: {job.plate_size}</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    {job.color_front}/{job.color_back}色 {job.print_count.toLocaleString()}通紙
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右パネル - 週間予定表 */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {/* ツールバー */}
        <div className="border-b border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold min-w-40">
                {weekStart.getMonth() + 1}/{weekStart.getDate()} ～ {weekEnd.getMonth() + 1}
                /{weekEnd.getDate()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setWeekOffset(0)
                }}
              >
                今週
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <select
                value={filterMachine}
                onChange={e => setFilterMachine(e.target.value)}
                className="px-2 py-1 border rounded text-xs"
              >
                <option value="all">全印刷機</option>
                {MACHINES.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="text-xs h-8">
                更新
              </Button>
            </div>
          </div>
        </div>

        {/* 週間表 */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {/* 日付ヘッダー */}
            <div className="flex sticky top-0 bg-gray-50 border-b border-gray-300 z-10">
              <div className="w-20 flex-shrink-0 border-r border-gray-300 bg-gray-100 flex items-end">
                <div className="w-full text-center pb-2 text-xs font-bold">印刷機</div>
              </div>
              {weekDates.map((date, idx) => (
                <div
                  key={idx}
                  className={`flex-1 min-w-40 text-center border-r border-gray-300 py-2 ${
                    isToday(date)
                      ? 'bg-blue-50 border-blue-300'
                      : date.getDay() === 0 || date.getDay() === 6
                        ? 'bg-gray-100'
                        : 'bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-gray-900">
                    {formatDisplayDate(date)} ({getDayOfWeek(date)})
                  </div>
                </div>
              ))}
            </div>

            {/* 機械ごとの行 */}
            {MACHINES.map(machine => (
              <div key={machine} className="flex border-b border-gray-200 hover:bg-gray-50">
                <div className="w-20 flex-shrink-0 border-r border-gray-300 bg-gray-50 flex items-center px-2 font-semibold text-xs sticky left-0 z-5">
                  {machine}
                </div>
                {weekDates.map((date, idx) => {
                  const dateStr = formatDate(date)
                  const jobs = getJobsForCell(machine, dateStr)
                  return (
                    <div
                      key={idx}
                      className={`flex-1 min-w-40 border-r border-gray-200 p-2 min-h-24 ${
                        isToday(date)
                          ? 'bg-blue-50'
                          : date.getDay() === 0 || date.getDay() === 6
                            ? 'bg-gray-50'
                            : 'bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        {jobs.map(job => (
                          <JobCard key={job.id} job={job} onClick={() => handleJobClick(job)} />
                        ))}
                        {jobs.length === 0 && (
                          <div className="text-xs text-gray-300 text-center py-4">-</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedJob && (
        <DetailModal job={selectedJob} open={detailOpen} onOpenChange={setDetailOpen} />
      )}
    </div>
  )
}
