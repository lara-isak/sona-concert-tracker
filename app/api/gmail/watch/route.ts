import { NextRequest, NextResponse } from "next/server"
import { getGmailClient } from "@/lib/gmail"

/**
 * Initialize Gmail watch to start receiving push notifications
 * 
 * This endpoint sets up Gmail to send notifications to Google Cloud Pub/Sub
 * when new emails arrive. The watch expires after 7 days and needs to be renewed.
 * 
 * Call this endpoint:
 * - Initially to set up the watch
 * - Periodically (weekly) to renew the watch
 */
export async function POST(request: NextRequest) {
  try {
    const gmail = getGmailClient()
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC || "gmail-notifications"
    
    if (!projectId) {
      return NextResponse.json(
        { error: "GOOGLE_CLOUD_PROJECT_ID not configured" },
        { status: 500 }
      )
    }

    // Construct the full topic name
    const fullTopicName = `projects/${projectId}/topics/${topicName}`

    // Start watching for new messages
    const response = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: fullTopicName,
        labelIds: ["INBOX"], // Only watch inbox
      },
    })

    return NextResponse.json({
      message: "Gmail watch started successfully",
      historyId: response.data.historyId,
      expiration: response.data.expiration,
      note: "Watch expires after 7 days. Renew by calling this endpoint again.",
    })
  } catch (error) {
    console.error("Error setting up Gmail watch:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to set up Gmail watch: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// GET endpoint to check watch status
export async function GET() {
  try {
    const gmail = getGmailClient()
    
    // Get user profile to check if watch is active
    const profile = await gmail.users.getProfile({ userId: "me" })
    
    return NextResponse.json({
      message: "Gmail API is connected",
      emailAddress: profile.data.emailAddress,
      historyId: profile.data.historyId,
      note: "To start watching, call POST /api/gmail/watch",
    })
  } catch (error) {
    console.error("Error checking Gmail status:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to check Gmail status: ${errorMessage}` },
      { status: 500 }
    )
  }
}
