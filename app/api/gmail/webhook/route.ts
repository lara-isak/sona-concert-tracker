import { NextRequest, NextResponse } from "next/server"
import { getGmailClient, getNewMessages, parseShowDetailsFromEmail, extractQRCodeFromEmail } from "@/lib/gmail"
import { uploadQRCode } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

/**
 * Pub/Sub webhook endpoint for Gmail push notifications
 * 
 * This endpoint receives notifications from Google Cloud Pub/Sub when new emails arrive.
 * It then fetches the email, extracts show details and QR codes, and creates/updates shows.
 * 
 * Setup required:
 * 1. Google Cloud Pub/Sub topic configured to send to this endpoint
 * 2. Gmail API watch() configured to send notifications to Pub/Sub
 * 3. Environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Pub/Sub message (basic verification)
    const body = await request.json()
    
    // Pub/Sub sends messages in a specific format
    // The actual message is base64 encoded in body.message.data
    if (!body.message || !body.message.data) {
      return NextResponse.json({ error: "Invalid Pub/Sub message format" }, { status: 400 })
    }

    // Decode the message
    const messageData = Buffer.from(body.message.data, "base64").toString("utf-8")
    const notification = JSON.parse(messageData)

    // Get Gmail client
    const gmail = getGmailClient()

    // Get the historyId from the notification
    const historyId = notification.historyId
    if (!historyId) {
      return NextResponse.json({ error: "No historyId in notification" }, { status: 400 })
    }

    // Get new messages since last historyId
    // Note: In production, you should store the last processed historyId in a database
    const messageIds = await getNewMessages(gmail, historyId)

    if (messageIds.length === 0) {
      return NextResponse.json({ message: "No new messages" }, { status: 200 })
    }

    const results = []

    // Process each new message
    for (const messageId of messageIds) {
      try {
        // Get full message
        const message = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        })

        const subject = message.data.payload?.headers?.find((h: any) => h.name === "Subject")?.value || ""
        const bodyText = extractEmailBody(message.data.payload)

        // Check if this looks like a ticket email
        // You can customize this logic based on your ticket vendor patterns
        const isTicketEmail = checkIfTicketEmail(subject, bodyText)
        if (!isTicketEmail) {
          continue // Skip non-ticket emails
        }

        // Parse show details from email
        const showData = parseShowDetailsFromEmail(bodyText, subject)
        if (!showData || !showData.show || !showData.date) {
          console.log(`Could not parse show details from email: ${messageId}`)
          continue
        }

        // Extract QR code
        const qrCodeData = await extractQRCodeFromEmail(gmail, messageId)
        let qrCodeUrl: string | undefined

        if (qrCodeData) {
          // For now, we'll create a temporary show to get an ID, then update it
          // Or we can upload first and then create the show
          // Let's create the show first, then upload QR code
          const tempShowData: Database["public"]["Tables"]["shows"]["Insert"] = {
            show: showData.show,
            date: showData.date,
            city: showData.city || "",
            venue: showData.venue || "",
            ticket: "YES",
            ticket_vendor: "",
            ticket_location: "",
            attendance: "NOT YET",
            note: `Imported from email: ${subject}`,
          }

          const { data: insertedShow, error: insertError } = await supabase
            .from("shows")
            .insert(tempShowData)
            .select()
            .single()

          if (insertError || !insertedShow) {
            console.error("Error creating show:", insertError)
            continue
          }

          // Upload QR code
          try {
            qrCodeUrl = await uploadQRCode(qrCodeData, insertedShow.id, "image/png")
            
            // Update show with QR code URL
            await supabase
              .from("shows")
              .update({ qr_code_url: qrCodeUrl })
              .eq("id", insertedShow.id)
          } catch (uploadError) {
            console.error("Error uploading QR code:", uploadError)
            // Continue even if QR upload fails
          }

          results.push({
            messageId,
            showId: insertedShow.id,
            showName: showData.show,
            qrCodeUploaded: !!qrCodeUrl,
          })
        } else {
          // Create show without QR code
          const showDataToInsert: Database["public"]["Tables"]["shows"]["Insert"] = {
            show: showData.show,
            date: showData.date,
            city: showData.city || "",
            venue: showData.venue || "",
            ticket: "YES",
            ticket_vendor: "",
            ticket_location: "",
            attendance: "NOT YET",
            note: `Imported from email: ${subject}`,
          }

          const { data: insertedShow, error: insertError } = await supabase
            .from("shows")
            .insert(showDataToInsert)
            .select()
            .single()

          if (insertError || !insertedShow) {
            console.error("Error creating show:", insertError)
            continue
          }

          results.push({
            messageId,
            showId: insertedShow.id,
            showName: showData.show,
            qrCodeUploaded: false,
          })
        }
      } catch (error) {
        console.error(`Error processing message ${messageId}:`, error)
        // Continue processing other messages
      }
    }

    return NextResponse.json({
      message: "Processed Gmail notifications",
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Gmail webhook error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Extract plain text body from email payload
function extractEmailBody(payload: any): string {
  let body = ""

  if (payload.body?.data) {
    body += Buffer.from(payload.body.data, "base64").toString("utf-8")
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body += Buffer.from(part.body.data, "base64").toString("utf-8")
      } else if (part.mimeType === "text/html" && part.body?.data) {
        // Strip HTML tags for basic text extraction
        const html = Buffer.from(part.body.data, "base64").toString("utf-8")
        body += html.replace(/<[^>]*>/g, " ")
      } else if (part.parts) {
        body += extractEmailBody(part)
      }
    }
  }

  return body
}

// Check if email looks like a ticket email
function checkIfTicketEmail(subject: string, body: string): boolean {
  const ticketKeywords = [
    "ticket",
    "tickets",
    "entry",
    "admission",
    "concert",
    "show",
    "event",
    "qr code",
    "barcode",
    "confirmation",
  ]

  const text = `${subject} ${body}`.toLowerCase()

  return ticketKeywords.some((keyword) => text.includes(keyword))
}

// GET endpoint for Pub/Sub subscription verification
// Pub/Sub sends a GET request to verify the endpoint
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge")
  
  if (challenge) {
    // Return the challenge for Pub/Sub verification
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ message: "Gmail webhook endpoint is active" }, { status: 200 })
}
