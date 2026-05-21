import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createClient()

  const allowedFields = [
    "dtp_completed",
    "paper_stacked",
    "plate_completed",
    "pp_processed",
    "printing_completed",
  ]

  const updateData: Record<string, boolean> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = Boolean(body[field])
    }
  }

  const { data: existing } = await supabase
    .from("print_item_details")
    .select("id")
    .eq("print_item_id", id)
    .maybeSingle()

  const result = existing
    ? await supabase
        .from("print_item_details")
        .update(updateData)
        .eq("print_item_id", id)
        .select()
        .single()
    : await supabase
        .from("print_item_details")
        .insert({
          print_item_id: id,
          ...updateData,
        })
        .select()
        .single()

  if (result.error) {
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data,
  })
}