export type Concert = {
  show: string
  date: string
  dotw: string
  city: string
  venue: string
  ticket: "YES" | "NO"
  ticketVendor: string
  ticketLocation: string
  attended: "YES" | "NO" | "NOT YET"
  note?: string
}

const STORAGE_KEY = "sona-concerts"

export function getConcerts(): Concert[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function saveConcerts(concerts: Concert[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(concerts))
  } catch (error) {
    console.error("Failed to save concerts to localStorage:", error)
    throw new Error("Failed to save concerts. LocalStorage may be full or unavailable.")
  }
}

export function addConcert(concert: Concert): void {
  const concerts = getConcerts()
  concerts.push(concert)
  saveConcerts(concerts)
}

export function parseGoogleSheetsCSV(csvText: string): Concert[] {
  const lines = csvText.split("\n").filter((line) => line.trim())
  if (lines.length < 2) return []

  // Skip header row (line 0)
  const concerts: Concert[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // Simple CSV parsing (handles quoted fields)
    const values: string[] = []
    let current = ""
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())

    // Expected columns: SHØW, DATE, DOTW, CITY, VENUE, TICKET, TICKET VENDOR, TICKET LOCATION, ATTENDED, NOTE
    if (values.length >= 9) {
      const show = values[0]?.trim() || ""
      const dateStr = values[1]?.trim() || ""
      const dotw = values[2]?.trim() || ""
      const city = values[3]?.trim() || ""
      const venue = values[4]?.trim() || ""
      const ticket = values[5]?.trim().toUpperCase() === "YES" ? "YES" : "NO"
      const ticketVendor = values[6]?.trim() || ""
      const ticketLocation = values[7]?.trim() || ""
      const attendedValue = values[8]?.trim().toUpperCase()
      // Handle "YES", "NO", "NOT YET" values
      let attended: "YES" | "NO" | "NOT YET"
      if (attendedValue === "YES") {
        attended = "YES"
      } else if (attendedValue === "NOT YET" || attendedValue === "NOTYET") {
        attended = "NOT YET"
      } else {
        attended = "NO"
      }
      const note = values[9]?.trim() || undefined

      // Skip empty rows
      if (!show && !dateStr) continue

      // Convert date from DD.MM.YYYY to YYYY-MM-DD
      let date = dateStr
      if (dateStr.includes(".")) {
        const [day, month, year] = dateStr.split(".")
        if (day && month && year) {
          date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        }
      }

      concerts.push({
        show,
        date,
        dotw,
        city,
        venue,
        ticket,
        ticketVendor,
        ticketLocation,
        attended,
        note: note || undefined,
      })
    }
  }

  return concerts.filter((c) => c.show && c.date)
}

