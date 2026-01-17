import { google } from "googleapis"
import type { Show } from "./shows"

// Gmail API client setup
export function getGmailClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN")
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_REDIRECT_URI)

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  return google.gmail({ version: "v1", auth: oauth2Client })
}

// Extract show details from email
export function parseShowDetailsFromEmail(emailBody: string, emailSubject: string): Partial<Show> | null {
  // Try to extract show name from subject or body
  const showName = extractShowName(emailSubject, emailBody)
  if (!showName) return null

  // Try to extract date
  const date = extractDate(emailBody, emailSubject)
  if (!date) return null

  // Try to extract venue and city
  const venue = extractVenue(emailBody)
  const city = extractCity(emailBody)

  return {
    show: showName,
    date,
    city: city || "",
    venue: venue || "",
    ticket: "YES",
    ticketVendor: "",
    ticketLocation: "",
    attendance: "NOT YET",
  }
}

// Extract show name from email
function extractShowName(subject: string, body: string): string | null {
  // Common patterns in ticket emails
  const patterns = [
    /(?:ticket|tickets?|entry|admission)\s+(?:for|to|at)?\s*:?\s*([^,\n]+)/i,
    /([A-Z][^,\n]{5,50})\s+(?:ticket|concert|show|event)/i,
    /(?:concert|show|event):\s*([^,\n]+)/i,
  ]

  for (const pattern of patterns) {
    const match = subject.match(pattern) || body.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  // Fallback: use subject if it looks like a show name
  if (subject.length > 3 && subject.length < 100) {
    return subject.trim()
  }

  return null
}

// Extract date from email
function extractDate(body: string, subject: string): string | null {
  // Common date patterns
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
    /(?:date|when|on):\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,
  ]

  const text = `${subject} ${body}`

  for (const pattern of datePatterns) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      const dateStr = matches[0]
      const date = parseDate(dateStr)
      if (date) {
        // Format as YYYY-MM-DD
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }
    }
  }

  return null
}

// Parse date string to Date object
function parseDate(dateStr: string): Date | null {
  // Try various date formats
  const formats = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY-MM-DD
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const [, part1, part2, part3] = match
      if (part3 && part3.length === 4) {
        // YYYY-MM-DD format
        if (part1.length === 4) {
          return new Date(`${part1}-${part2}-${part3}`)
        }
        // Assume MM/DD/YYYY for US format
        return new Date(`${part3}-${part1}-${part2}`)
      } else if (part3 && part3.length === 2) {
        // Assume MM/DD/YY
        const year = parseInt(part3) < 50 ? 2000 + parseInt(part3) : 1900 + parseInt(part3)
        return new Date(`${year}-${part1}-${part2}`)
      }
    }
  }

  // Try native Date parsing
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  return null
}

// Extract venue from email
function extractVenue(body: string): string | null {
  const patterns = [
    /(?:venue|location|at):\s*([^,\n]{3,50})/i,
    /(?:theater|theatre|arena|stadium|hall|center|centre|club|bar|venue)\s+([A-Z][^,\n]{2,40})/i,
  ]

  for (const pattern of patterns) {
    const match = body.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

// Extract city from email
function extractCity(body: string): string | null {
  const patterns = [
    /(?:city|in|at):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /([A-Z][a-z]+),\s*(?:[A-Z]{2}|[A-Z][a-z]+)/, // "City, State" or "City, Country"
  ]

  for (const pattern of patterns) {
    const match = body.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}

// Find QR code in email attachments or inline images
export async function extractQRCodeFromEmail(gmail: any, messageId: string): Promise<string | null> {
  try {
    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    })

    const parts = message.data.payload?.parts || []
    if (!parts.length && message.data.payload?.body?.attachmentId) {
      // Single attachment
      return await downloadAndCheckAttachment(gmail, messageId, message.data.payload.body.attachmentId)
    }

    // Check all parts for QR codes
    for (const part of parts) {
      if (part.mimeType?.startsWith("image/")) {
        const qrUrl = await downloadAndCheckAttachment(gmail, messageId, part.body?.attachmentId || "")
        if (qrUrl) return qrUrl
      } else if (part.mimeType === "application/pdf") {
        // PDF might contain QR code - would need PDF parsing library
        // For now, skip PDFs or implement basic extraction
      } else if (part.parts) {
        // Recursive check nested parts
        for (const subPart of part.parts) {
          if (subPart.mimeType?.startsWith("image/")) {
            const qrUrl = await downloadAndCheckAttachment(gmail, messageId, subPart.body?.attachmentId || "")
            if (qrUrl) return qrUrl
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error extracting QR code from email:", error)
    return null
  }
}

// Download attachment and check if it's a QR code
async function downloadAndCheckAttachment(gmail: any, messageId: string, attachmentId: string): Promise<string | null> {
  if (!attachmentId) return null

  try {
    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    })

    const data = attachment.data.data
    if (!data) return null

    // Decode base64
    const buffer = Buffer.from(data, "base64")

    // Check if it looks like a QR code (basic heuristic: small square image)
    // In production, you'd use a QR code detection library
    // For now, we'll upload all images and let the user verify
    
    // Upload to Supabase Storage (will be implemented in storage utility)
    // For now, return the base64 data URL
    const mimeType = "image/png" // Default, should detect from attachment
    const base64Url = `data:${mimeType};base64,${data}`
    
    return base64Url
  } catch (error) {
    console.error("Error downloading attachment:", error)
    return null
  }
}

// Get new messages since last historyId
export async function getNewMessages(gmail: any, lastHistoryId?: string): Promise<any[]> {
  try {
    if (!lastHistoryId) {
      // Get initial history ID
      const profile = await gmail.users.getProfile({ userId: "me" })
      return []
    }

    const history = await gmail.users.history.list({
      userId: "me",
      startHistoryId: lastHistoryId,
      historyTypes: ["messageAdded"],
    })

    if (!history.data.history) return []

    const messageIds: string[] = []
    for (const record of history.data.history) {
      if (record.messagesAdded) {
        for (const msg of record.messagesAdded) {
          if (msg.message?.id) {
            messageIds.push(msg.message.id)
          }
        }
      }
    }

    return messageIds
  } catch (error) {
    console.error("Error getting new messages:", error)
    return []
  }
}
