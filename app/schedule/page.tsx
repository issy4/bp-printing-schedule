import { getWeeklyCalendarData } from "@/lib/schedule/get-weekly-calendar-data"

function makeCellKey(machineId: string, shiftCategory: string, date: string) {
  return `${machineId}__${shiftCategory}__${date}`
}

export default async function SchedulePage() {
  const data = await getWeeklyCalendarData("2026-04-08")

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">週間予定表</h1>

      <div className="grid grid-cols-[320px_1fr] gap-4">
        <aside className="border rounded-lg p-3">
          <h2 className="font-semibold mb-3">未割当案件</h2>
          <div className="space-y-2">
            {data.unassignedBlocks.map((item) => (
              <div key={item.block_id} className="border rounded p-2 text-sm">
                <div className="font-semibold">{item.unit_name}</div>
                <div>{item.part_name}</div>
                <div>{item.order_number}</div>
                <div className="truncate">{item.product_name}</div>
              </div>
            ))}
          </div>
        </aside>

        <section className="overflow-x-auto">
          <table className="min-w-[1200px] border-collapse w-full text-sm">
            <thead>
              <tr>
                <th className="border bg-white p-2 sticky left-0 z-10">印刷機</th>
                {data.weekDays.map((day) => (
                  <th key={day.date} className="border bg-white p-2 min-w-[160px]">
                    {day.label}（{day.weekday}）
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.machineRows.map((machineRow) => (
                <tr key={`${machineRow.machine_id}-${machineRow.shift_category}`}>
                  <td className="border bg-white p-2 align-top sticky left-0 z-10 whitespace-nowrap">
                    {machineRow.machine_shift_name}
                  </td>

                  {data.weekDays.map((day) => {
                    const key = makeCellKey(machineRow.machine_id, machineRow.shift_category, day.date)
                    const cell = data.cells[key]

                    return (
                      <td key={key} className="border align-top p-2 h-32">
                        <div className="space-y-2">
                          {cell?.blocks.map((block) => (
                            <div key={block.block_id} className="border rounded p-2 bg-white">
                              <div className="font-semibold">{block.unit_name}</div>
                              <div>{block.part_name}</div>
                              <div>{block.order_number}</div>
                              <div className="truncate" title={block.product_name ?? ""}>
                                {block.product_name}
                              </div>
                              <div>
                                {block.color_front}/{block.color_back}・{block.print_count ?? "-"}通紙
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}