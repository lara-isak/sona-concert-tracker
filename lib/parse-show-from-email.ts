/**
 * Heuristic parser: extract show name, date, city, venue from ticket/confirmation email text.
 * Used by Resend Inbound webhook. Returns null if we can't get enough to create a show.
 */

export type ParsedShow = {
  show: string
  date: string // YYYY-MM-DD
  city: string
  venue: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** Try to parse a date string into YYYY-MM-DD */
function parseDate(str: string): string | null {
  if (!str || str.length > 60) return null
  const s = str.trim()

  // Already YYYY-MM-DD
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) {
    const [, y, m, d] = iso
    if (y && m && d) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  // DD/MM/YYYY or MM/DD/YYYY (prefer DD/MM when day > 12)
  const slash = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (slash) {
    const [, a, b, year] = slash
    let month: string
    let day: string
    const an = parseInt(a!, 10)
    const bn = parseInt(b!, 10)
    if (an > 12) {
      day = a!.padStart(2, "0")
      month = b!.padStart(2, "0")
    } else if (bn > 12) {
      month = a!.padStart(2, "0")
      day = b!.padStart(2, "0")
    } else {
      month = a!.padStart(2, "0")
      day = b!.padStart(2, "0")
    }
    return `${year}-${month}-${day}`
  }

  // Month DD, YYYY or DD Month YYYY
  const months =
    "january|february|march|april|may|june|july|august|september|october|november|december"
  const monthNames = months.split("|")
  const monthNum = (m: string) => String(monthNames.indexOf(m.toLowerCase()) + 1).padStart(2, "0")
  for (const monthName of monthNames) {
    const re1 = new RegExp(`${monthName}\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i")
    const m1 = re1.exec(s)
    if (m1) {
      return `${m1[2]}-${monthNum(monthName)}-${m1[1].padStart(2, "0")}`
    }
    const re2 = new RegExp(`(\\d{1,2})\\s+${monthName}\\s+(\\d{4})`, "i")
    const m2 = re2.exec(s)
    if (m2) {
      return `${m2[2]}-${monthNum(monthName)}-${m2[1].padStart(2, "0")}`
    }
  }

  return null
}

/** Find first date in text that looks like an event date (year >= current - 1) */
function extractDate(text: string): string | null {
  const currentYear = new Date().getFullYear()

  // Label: value line (e.g. "Date: March 15, 2025")
  const labelMatch = text.match(
    /(?:date|when|event date|show date|concert date)[\s:]+([^\n]+)/i
  )
  if (labelMatch && labelMatch[1]) {
    const parsed = parseDate(labelMatch[1])
    if (parsed) {
      const y = parseInt(parsed.slice(0, 4), 10)
      if (y >= currentYear - 1 && y <= currentYear + 2) return parsed
    }
  }

  // Standalone date patterns
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/)
  if (isoMatch) {
    const parsed = parseDate(isoMatch[0])
    if (parsed) {
      const y = parseInt(parsed.slice(0, 4), 10)
      if (y >= currentYear - 1 && y <= currentYear + 2) return parsed
    }
  }

  const slashMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/)
  if (slashMatch) {
    const parsed = parseDate(slashMatch[0])
    if (parsed) {
      const y = parseInt(parsed.slice(0, 4), 10)
      if (y >= currentYear - 1 && y <= currentYear + 2) return parsed
    }
  }

  const monthMatch = text.match(
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i
  )
  if (monthMatch) {
    const parsed = parseDate(monthMatch[0])
    if (parsed) {
      const y = parseInt(parsed.slice(0, 4), 10)
      if (y >= currentYear - 1 && y <= currentYear + 2) return parsed
    }
  }

  return null
}

function extractLabel(text: string, labels: string[]): string | null {
  const lower = text.toLowerCase()
  for (const label of labels) {
    const re = new RegExp(`${label.replace(/\s+/g, "\\s+")}[\\s:]+([^\\n<]+)`, "i")
    const m = re.exec(text)
    if (m && m[1]) {
      const value = m[1].trim().replace(/\s+/g, " ").slice(0, 200)
      if (value.length > 0) return value
    }
  }
  return null
}

/**
 * Parse email subject + body (plain text or HTML) and return show/date/city/venue if possible.
 */
export function parseShowFromEmail(subject: string, body: string): ParsedShow | null {
  const text = body.includes("<") ? stripHtml(body) : body
  const combined = `${subject}\n${text}`

  const date = extractDate(combined)
  const venue =
    extractLabel(combined, ["venue", "location", "where", "place", "at venue"]) ||
    extractLabel(combined, ["theatre", "theater", "arena", "hall"])
  const city = extractLabel(combined, ["city", "location"])
  const show =
    extractLabel(combined, ["event", "concert", "show", "performance", "artist", "act"]) ||
    subject.trim().slice(0, 200)

  // Require at least show name and date; city/venue we can default
  if (!show || !date) return null

  const cityFinal = city || "Unknown"
  const venueFinal = venue || "Unknown"

  return {
    show: show.trim(),
    date,
    city: cityFinal,
    venue: venueFinal,
  }
}
