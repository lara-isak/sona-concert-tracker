export type Show = {
  show: string
  date: string
  city: string
  venue: string
  ticket: "YES" | "NO"
  ticketVendor: string
  ticketLocation: string
  attendance: "YES" | "NO" | "NOT YET" | "CANCELLED" | "POSTPONED"
  note?: string
}

// Helper function to get day of week from date
export function getDayOfWeek(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { weekday: "long" })
}

export function parseGoogleSheetsCSV(csvText: string): Show[] {
  const lines = csvText.split("\n").filter((line) => line.trim())
  if (lines.length < 2) return []

  // Skip header row (line 0)
  const shows: Show[] = []

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

    // Expected columns: SHØW, DATE, DOTW (optional), CITY, VENUE, TICKET, TICKET VENDOR, TICKET LOCATION, ATTENDED, NOTE
    // Note: DOTW is ignored - we calculate it from DATE
    if (values.length >= 9) {
      const show = values[0]?.trim() || ""
      const dateStr = values[1]?.trim() || ""
      // Skip dotw (values[2]) - we'll calculate it from date
      const city = values[3]?.trim() || ""
      const venue = values[4]?.trim() || ""
      const ticket = values[5]?.trim().toUpperCase() === "YES" ? "YES" : "NO"
      const ticketVendor = values[6]?.trim() || ""
      const ticketLocation = values[7]?.trim() || ""
      const attendanceValue = values[8]?.trim().toUpperCase()
      // Handle "YES", "NO", "NOT YET", "CANCELLED", "POSTPONED" values
      let attendance: "YES" | "NO" | "NOT YET" | "CANCELLED" | "POSTPONED"
      if (attendanceValue === "YES") {
        attendance = "YES"
      } else if (attendanceValue === "NOT YET" || attendanceValue === "NOTYET" || attendanceValue === "NOT YET ") {
        attendance = "NOT YET"
      } else if (attendanceValue === "CANCELLED" || attendanceValue === "CANCELED") {
        attendance = "CANCELLED"
      } else if (attendanceValue === "POSTPONED") {
        attendance = "POSTPONED"
      } else {
        attendance = "NO"
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

      shows.push({
        show,
        date,
        city,
        venue,
        ticket,
        ticketVendor,
        ticketLocation,
        attendance,
        note: note || undefined,
      })
    }
  }

  return shows.filter((c) => c.show && c.date)
}

