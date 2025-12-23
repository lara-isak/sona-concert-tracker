import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Show } from "@/lib/shows"
import type { Database } from "@/lib/database.types"

// GET - Fetch all shows
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("shows")
      .select("*")
      .order("date", { ascending: true })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform database format to Show type
    const shows: Show[] = ((data as Database["public"]["Tables"]["shows"]["Row"][]) || []).map((row) => ({
      show: row.show,
      date: row.date,
      city: row.city,
      venue: row.venue,
      ticket: row.ticket,
      ticketVendor: row.ticket_vendor,
      ticketLocation: row.ticket_location,
      attendance: row.attendance,
      note: row.note || undefined,
    }))

    return NextResponse.json({ shows })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to fetch shows" }, { status: 500 })
  }
}

// POST - Create a new show
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const show: Show = body

    // Transform Show type to database format
    const insertData: Database["public"]["Tables"]["shows"]["Insert"] = {
      show: show.show,
      date: show.date,
      city: show.city,
      venue: show.venue,
      ticket: show.ticket,
      ticket_vendor: show.ticketVendor,
      ticket_location: show.ticketLocation,
      attendance: show.attendance,
      note: show.note || null,
    }
    
    const { data, error } = await supabase
      .from("shows")
      .insert(insertData as any)
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ show: data }, { status: 201 })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to create show" }, { status: 500 })
  }
}

// PUT - Update multiple shows (for bulk import)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const shows: Show[] = body.shows

    // Delete all existing shows
    const { error: deleteError } = await supabase.from("shows").delete().neq("id", "")

    if (deleteError) {
      console.error("Delete error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new shows
    const showsToInsert: Database["public"]["Tables"]["shows"]["Insert"][] = shows.map((show) => ({
      show: show.show,
      date: show.date,
      city: show.city,
      venue: show.venue,
      ticket: show.ticket,
      ticket_vendor: show.ticketVendor,
      ticket_location: show.ticketLocation,
      attendance: show.attendance,
      note: show.note || null,
    }))

    const { data, error } = await supabase.from("shows").insert(showsToInsert as any).select()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shows: data, count: data?.length || 0 })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Failed to update shows" }, { status: 500 })
  }
}

