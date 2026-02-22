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

  // DD.MM.YYYY (Eventim / EU)
  const dot = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s)
  if (dot) {
    const [, d, m, y] = dot
    if (d && m && y) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
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

function isReasonableEventYear(parsedDate: string): boolean {
  const y = parseInt(parsedDate.slice(0, 4), 10)
  const currentYear = new Date().getFullYear()
  return y >= currentYear - 1 && y <= currentYear + 2
}

/** Find first date in text that looks like an event date (year >= current - 1) */
function extractDate(text: string): string | null {
  // EVENTIM/order emails: prefer "Date: Wed, 11.03.2026" (event) over "Order date: 18.02.2026" (order)
  // Match line that starts with "Date:" or "Datum:" (event date), not "Order date"
  const eventDateLabel = text.match(/(?:^|\n)\s*(?:Date|Datum)\s*:\s*([^\n]+)/im)
  if (eventDateLabel && eventDateLabel[1]) {
    const parsed = parseDate(eventDateLabel[1])
    if (parsed && isReasonableEventYear(parsed)) return parsed
  }

  // Other date labels (when, event date, show date, etc.)
  const labelMatch = text.match(
    /(?:when|event date|show date|concert date|veranstaltungsdatum)[\s:]+([^\n]+)/i
  )
  if (labelMatch && labelMatch[1]) {
    const parsed = parseDate(labelMatch[1])
    if (parsed && isReasonableEventYear(parsed)) return parsed
  }

  // Standalone date patterns (DD.MM.YYYY first for Eventim)
  const dotMatch = text.match(/\d{1,2}\.\d{1,2}\.\d{4}/)
  if (dotMatch) {
    const parsed = parseDate(dotMatch[0])
    if (parsed && isReasonableEventYear(parsed)) return parsed
  }

  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/)
  if (isoMatch) {
    const parsed = parseDate(isoMatch[0])
    if (parsed && isReasonableEventYear(parsed)) return parsed
  }

  const slashMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{4}/)
  if (slashMatch) {
    const parsed = parseDate(slashMatch[0])
    if (parsed && isReasonableEventYear(parsed)) return parsed
  }

  const monthMatch = text.match(
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i
  )
  if (monthMatch) {
    const parsed = parseDate(monthMatch[0])
    if (parsed && isReasonableEventYear(parsed)) return parsed
  }

  return null
}

function extractLabel(text: string, labels: string[]): string | null {
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

/** Extract show name from EVENTIM subject: "Your EVENTIM order: Artist - order number 123" */
function extractEventimShowFromSubject(subject: string): string | null {
  const m = subject.match(/\bEVENTIM\s+order\s*:\s*(.+?)\s*-\s*order\s+number\s+\d+/i)
  return m ? m[1].trim().slice(0, 200) : null
}

/** EVENTIM body line: "Artist, City, DD.MM.YYYY" (e.g. Psychedelic Porn Crumpets, Berlin, 11.03.2026) */
function extractEventimArtistCityDate(text: string): {
  show: string
  city: string
  date: string | null
} | null {
  // Try full-line match first (plain text), then inline (stripped HTML)
  const m =
    text.match(/^([^,\n]+),\s*([^,\n]+),\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*$/m) ??
    text.match(/([^,\n]+),\s*([^,\n]+),\s*(\d{1,2}\.\d{1,2}\.\d{4})\b/)
  if (!m || !m[1] || !m[2] || !m[3]) return null
  const [, show, city, dateStr] = m
  const parsed = parseDate(dateStr)
  if (!parsed || !isReasonableEventYear(parsed)) return null
  return { show: show.trim().slice(0, 200), city: city.trim(), date: parsed }
}

/** From "VenueName, Street, PostalCode City" return just venue name (first segment); optionally extract city from last segment. */
function parseVenueLine(venueLine: string): { venueName: string; cityFromVenue: string | null } {
  const trimmed = venueLine.trim()
  if (!trimmed) return { venueName: "Unknown", cityFromVenue: null }
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean)
  const venueName = parts[0] ?? trimmed
  // Last part might be "10999 Berlin" -> city "Berlin"
  const last = parts[parts.length - 1]
  const cityFromVenue =
    last && parts.length > 1 && /^\d{4,5}\s+.+$/.test(last)
      ? last.replace(/^\d{4,5}\s+/, "").trim()
      : parts.length > 1
        ? last ?? null
        : null
  return {
    venueName: venueName.replace(/\s+/g, "").toUpperCase() === "SO36" ? "SO36" : venueName,
    cityFromVenue: cityFromVenue && cityFromVenue.length <= 50 ? cityFromVenue : null,
  }
}

/** Reject sentence-like label value; use as-is if city-like, else take last word that looks like a city name. */
function sanitizeCityFromLabel(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 200) return null
  const looksLikeSentence = /[?*]|https?:\/\/|\b(you|can|so that|at any|when logged|please|click)\b/i.test(trimmed)
  // If short and city-like (no sentence), use as-is
  if (!looksLikeSentence && trimmed.length <= 50 && /^[a-zA-Z\u00C0-\u024F\s\-'.]+$/.test(trimmed) && trimmed.split(/\s+/).length <= 3)
    return trimmed
  // Otherwise take last token that looks like a city (letters only, 2–40 chars), e.g. "... Berlin" -> "Berlin"
  const words = trimmed.split(/\s+/).filter((w) => /^[a-zA-Z\u00C0-\u024F\-']{2,40}$/.test(w))
  return words.length > 0 ? words[words.length - 1]! : null
}

/**
 * Parse email subject + body (plain text or HTML) and return show/date/city/venue if possible.
 */
export function parseShowFromEmail(subject: string, body: string): ParsedShow | null {
  const text = body.includes("<") ? stripHtml(body) : body
  const combined = `${subject}\n${text}`

  // EVENTIM: parse early so we can prefer event date/city from "Artist, City, DD.MM.YYYY" line
  const eventimFromSubject = extractEventimShowFromSubject(subject)
  const eventimFromBody = extractEventimArtistCityDate(text)

  const date =
    (eventimFromBody ? eventimFromBody.date : null) || extractDate(combined)
  const venueRaw = extractLabel(combined, [
    "venue",
    "location",
    "where",
    "place",
    "at venue",
    "ort",
    "veranstaltungsort",
    "theatre",
    "theater",
    "arena",
    "hall",
  ])
  // EVENTIM venue line can run into next line in HTML; trim at "Promoter:". Then use only venue name (first segment), e.g. "SO 36" not full address.
  const venueLine =
    venueRaw && venueRaw.split(/\s+Promoter\s*:/i)[0].trim()
  const { venueName: venueFinal, cityFromVenue } = parseVenueLine(venueLine ?? "")

  const cityFromLabel =
    extractLabel(combined, ["city", "stadt", "location"]) ||
    extractLabel(combined, ["ort"])
  // Prefer EVENTIM "Artist, City, Date" city, then city from venue line; sanitize label value (reject sentences, take last city-like word if needed).
  const cityFinal =
    (eventimFromBody ? eventimFromBody.city : null) ||
    cityFromVenue ||
    (cityFromLabel ? sanitizeCityFromLabel(cityFromLabel) : null) ||
    "Unknown"

  const show =
    eventimFromSubject ||
    (eventimFromBody ? eventimFromBody.show : null) ||
    extractLabel(combined, [
      "event",
      "veranstaltung",
      "concert",
      "konzert",
      "show",
      "performance",
      "artist",
      "act",
      "event name",
      "eventtitel",
    ]) ||
    subject.trim().slice(0, 200)

  // Require at least show name and date; city/venue we can default
  if (!show || !date) return null

  return {
    show: show.trim(),
    date,
    city: cityFinal,
    venue: venueFinal,
  }
}
