import type { Show } from "./shows"

const API_BASE = "/api/shows"

export async function fetchShows(): Promise<Show[]> {
  try {
    const response = await fetch(API_BASE)
    if (!response.ok) {
      throw new Error("Failed to fetch shows")
    }
    const data = await response.json()
    return data.shows || []
  } catch (error) {
    console.error("Error fetching shows:", error)
    throw error
  }
}

export async function createShow(show: Show): Promise<Show> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(show),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create show")
    }

    const data = await response.json()
    // Transform back to Show format
    const dbShow = data.show
    return {
      show: dbShow.show,
      date: dbShow.date,
      city: dbShow.city,
      venue: dbShow.venue,
      ticket: dbShow.ticket,
      ticketVendor: dbShow.ticket_vendor,
      ticketLocation: dbShow.ticket_location,
      attendance: dbShow.attendance,
      note: dbShow.note || undefined,
    }
  } catch (error) {
    console.error("Error creating show:", error)
    throw error
  }
}

export async function importShows(shows: Show[]): Promise<void> {
  try {
    const response = await fetch(API_BASE, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shows }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to import shows")
    }

    await response.json()
  } catch (error) {
    console.error("Error importing shows:", error)
    throw error
  }
}

