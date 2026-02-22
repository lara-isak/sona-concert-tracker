import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { parseShowFromEmail } from "@/lib/parse-show-from-email"

type DbRow = Database["public"]["Tables"]["shows"]["Row"]

const resendApiKey = process.env.RESEND_API_KEY
const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET

/**
 * Resend Inbound webhook: when someone forwards an email to your Resend inbound address,
 * Resend POSTs here. We fetch the email body, parse show details, and create a show.
 *
 * Setup: Resend Dashboard → Receiving → add domain + webhook URL → this endpoint.
 * Env: RESEND_API_KEY (required), RESEND_WEBHOOK_SECRET (recommended).
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    if (!rawBody) {
      return NextResponse.json({ error: "No body" }, { status: 400 })
    }

    let event: { type: string; data: { email_id: string; subject?: string } }
    if (resendWebhookSecret) {
      const resend = new Resend(resendApiKey ?? undefined)
      try {
        const verified = resend.webhooks.verify({
          payload: rawBody,
          headers: {
            id: request.headers.get("svix-id") ?? "",
            timestamp: request.headers.get("svix-timestamp") ?? "",
            signature: request.headers.get("svix-signature") ?? "",
          },
          webhookSecret: resendWebhookSecret,
        })
        event = verified as typeof event
      } catch {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
      }
    } else {
      event = JSON.parse(rawBody) as typeof event
    }

    if (event.type !== "email.received") {
      return NextResponse.json({ ok: true, ignored: event.type })
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is required to fetch email content")
      return NextResponse.json(
        { error: "Server misconfiguration: RESEND_API_KEY" },
        { status: 500 }
      )
    }

    const resend = new Resend(resendApiKey)
    const { data: email, error: fetchError } = await resend.emails.receiving.get(event.data.email_id)
    if (fetchError || !email) {
      console.error("Resend get email failed:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch email content" },
        { status: 502 }
      )
    }

    const subject = email.subject ?? ""
    const body = email.text ?? email.html ?? ""
    const bodyPreview = body.slice(0, 500).replace(/\s+/g, " ")
    const parsed = parseShowFromEmail(subject, body)
    if (!parsed) {
      console.warn("Inbound: parse failed", {
        subject,
        bodyPreview,
      })
      return NextResponse.json({
        ok: true,
        created: false,
        reason: "Could not parse show details from email (need at least event name and date)",
      })
    }

    const showDate = new Date(parsed.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    showDate.setHours(0, 0, 0, 0)
    const attendance = showDate < today ? "YES" : "NOT YET"

    const isEventim = /EVENTIM/i.test(subject)
    const insertData: Database["public"]["Tables"]["shows"]["Insert"] = {
      show: parsed.show,
      date: parsed.date,
      city: parsed.city,
      venue: parsed.venue,
      ticket: "YES",
      ticket_vendor: isEventim ? "Eventim" : "",
      ticket_location: "In App",
      attendance: attendance as "YES" | "NO" | "NOT YET" | "CANCELLED" | "POSTPONED",
      note: null,
      qr_code_url: null,
    }

    const { data: row, error: insertError } = await supabase
      .from("shows")
      .insert(insertData as any)
      .select()
      .single()

    if (insertError) {
      console.error("Supabase insert error:", insertError)
      return NextResponse.json(
        { error: `Failed to create show: ${insertError.message}` },
        { status: 500 }
      )
    }

    const show = row as DbRow
    console.info("Inbound: show created", { id: show.id, show: show.show, date: show.date })
    return NextResponse.json({
      ok: true,
      created: true,
      show: {
        id: show.id,
        show: show.show,
        date: show.date,
        city: show.city,
        venue: show.venue,
      },
    })
  } catch (error) {
    console.error("Inbound email handler error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
