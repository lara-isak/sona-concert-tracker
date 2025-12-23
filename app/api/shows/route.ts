import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Show } from "@/lib/shows"
import type { Database } from "@/lib/database.types"

// Helper function to validate date format and value
function validateDate(date: string, showName?: string): { valid: boolean; error?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      valid: false,
      error: showName
        ? `Invalid date format for show "${showName}": ${date}. Expected YYYY-MM-DD format.`
        : `Invalid date format: ${date}. Expected YYYY-MM-DD format.`,
    }
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return {
      valid: false,
      error: showName ? `Invalid date value for show "${showName}": ${date}` : `Invalid date value: ${date}`,
    }
  }

  return { valid: true }
}

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

    // Validate required fields
    if (!show.show || !show.date || !show.city || !show.venue) {
      return NextResponse.json(
        { error: `Missing required fields: show=${show.show}, date=${show.date}, city=${show.city}, venue=${show.venue}` },
        { status: 400 }
      )
    }

    // Validate date format and value
    const dateValidation = validateDate(show.date)
    if (!dateValidation.valid) {
      return NextResponse.json({ error: dateValidation.error }, { status: 400 })
    }

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
      return NextResponse.json({ 
        error: `Failed to create show: ${error.message}${error.details ? ` (Details: ${error.details})` : ""}${error.hint ? ` (Hint: ${error.hint})` : ""}` 
      }, { status: 500 })
    }

    return NextResponse.json({ show: data }, { status: 201 })
  } catch (error) {
    console.error("API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to create show"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// PUT - Update multiple shows (for bulk import)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const shows: Show[] = body.shows

    if (!shows || !Array.isArray(shows) || shows.length === 0) {
      return NextResponse.json({ error: "No shows provided to import" }, { status: 400 })
    }

    // Validate shows data
    for (const show of shows) {
      if (!show.show || !show.date || !show.city || !show.venue) {
        return NextResponse.json(
          { error: `Invalid show data: missing required fields (show: ${show.show}, date: ${show.date}, city: ${show.city}, venue: ${show.venue})` },
          { status: 400 }
        )
      }
      
      // Validate date format and value
      const dateValidation = validateDate(show.date, show.show)
      if (!dateValidation.valid) {
        return NextResponse.json({ error: dateValidation.error }, { status: 400 })
      }
    }

    // Delete all existing shows
    // Use a filter that matches all rows: created_at >= a very old date (matches all rows)
    const { error: deleteError } = await supabase.from("shows").delete().gte("created_at", "1970-01-01")

    if (deleteError) {
      console.error("Delete error:", deleteError)
      return NextResponse.json({ error: `Failed to delete existing shows: ${deleteError.message} (Code: ${deleteError.code})` }, { status: 500 })
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
      console.error("Supabase insert error:", error)
      return NextResponse.json({ 
        error: `Failed to insert shows: ${error.message}${error.details ? ` (Details: ${error.details})` : ""}${error.hint ? ` (Hint: ${error.hint})` : ""}` 
      }, { status: 500 })
    }

    return NextResponse.json({ shows: data, count: data?.length || 0 })
  } catch (error) {
    console.error("API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to update shows"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

