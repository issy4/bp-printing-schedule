import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type ImportItem = {
  part_name: string
  plate_size?: string | null
  color_front?: number | null
  color_back?: number | null
  color_note?: string | null
  print_count?: number | null
  press_count?: number | null
  imposition?: string | null
  page_count?: number | null
  fold_count?: number | null
  note?: string | null
}

type ImportBody = {
  order_entry_id: string
  source_file_id?: string | null
  items: ImportItem[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportBody
    const supabase = await createClient()

    if (!body.order_entry_id) {
      return NextResponse.json(
        { success: false, error: "order_entry_id は必須です。" },
        { status: 400 },
      )
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "items が空です。" },
        { status: 400 },
      )
    }

    const createdItems = []

    for (const item of body.items) {
      if (!item.part_name) {
        return NextResponse.json(
          { success: false, error: "part_name は必須です。" },
          { status: 400 },
        )
      }

      const pressCount = item.press_count && item.press_count > 0 ? item.press_count : 1

      // 1. print_items 作成
      // print_units / schedule_blocks はDBトリガーで自動作成される
      const { data: printItem, error: printItemError } = await supabase
        .from("print_items")
        .insert({
          order_entry_id: body.order_entry_id,
          source_file_id: body.source_file_id ?? null,
          part_name: item.part_name,
          plate_size: item.plate_size ?? null,
          color_front: item.color_front ?? null,
          color_back: item.color_back ?? null,
          color_note: item.color_note ?? null,
          print_count: item.print_count ?? null,
          press_count: pressCount,
          imposition: item.imposition ?? null,
          page_count: item.page_count ?? null,
          fold_count: item.fold_count ?? null,
          note: item.note ?? null,
        })
        .select()
        .single()

      if (printItemError) {
        return NextResponse.json(
          { success: false, error: printItemError.message },
          { status: 500 },
        )
      }

      // 2. print_item_details 作成
      const { data: detail, error: detailError } = await supabase
        .from("print_item_details")
        .insert({
          print_item_id: printItem.id,
          dtp_completed: false,
          paper_stacked: false,
          plate_completed: false,
          pp_processed: false,
          printing_completed: false,
        })
        .select()
        .single()

      if (detailError) {
        return NextResponse.json(
          { success: false, error: detailError.message },
          { status: 500 },
        )
      }

      // 3. トリガーで作成済みの print_units を取得
      const { data: printUnits, error: unitError } = await supabase
        .from("print_units")
        .select("*")
        .eq("print_item_id", printItem.id)
        .order("unit_no", { ascending: true })

      if (unitError) {
        return NextResponse.json(
          { success: false, error: unitError.message },
          { status: 500 },
        )
      }

      const unitIds = (printUnits ?? []).map((unit) => unit.id)

      // 4. トリガーで作成済みの schedule_blocks を取得
      const { data: scheduleBlocks, error: scheduleError } = await supabase
        .from("schedule_blocks")
        .select("*")
        .in("print_unit_id", unitIds)
        .order("block_no", { ascending: true })

      if (scheduleError) {
        return NextResponse.json(
          { success: false, error: scheduleError.message },
          { status: 500 },
        )
      }

      createdItems.push({
        print_item: printItem,
        print_item_detail: detail,
        print_units: printUnits,
        schedule_blocks: scheduleBlocks,
      })
    }

    return NextResponse.json({
      success: true,
      data: createdItems,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "印刷項目のインポートに失敗しました。"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}