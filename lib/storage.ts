import { getSupabaseServer } from "./supabase-server"
import { supabase } from "./supabase"

/**
 * Upload QR code image to Supabase Storage
 * @param imageData Base64 encoded image data or Buffer
 * @param showId Show ID to associate with the QR code
 * @param mimeType MIME type of the image (default: image/png)
 * @returns Public URL of the uploaded image
 */
export async function uploadQRCode(
  imageData: string | Buffer,
  showId: string,
  mimeType: string = "image/png"
): Promise<string> {
  try {
    // Convert base64 to buffer if needed
    let buffer: Buffer
    if (typeof imageData === "string") {
      // Remove data URL prefix if present
      const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData
      buffer = Buffer.from(base64Data, "base64")
    } else {
      buffer = imageData
    }

    // Determine file extension from MIME type
    const extension = mimeType.split("/")[1] || "png"
    const fileName = `qr-codes/${showId}-${Date.now()}.${extension}`

    // Use server-side client for uploads (bypasses RLS if using service role key)
    const supabaseServer = getSupabaseServer()

    // Upload to Supabase Storage
    const { data, error } = await supabaseServer.storage
      .from("tickets") // Storage bucket name - you'll need to create this in Supabase
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to upload QR code: ${error.message}`)
    }

    // Get public URL (works with RLS SELECT policy or public bucket)
    // Use the regular client for getting public URL (works with anon key + SELECT policy)
    const { data: urlData } = supabase.storage.from("tickets").getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      throw new Error("Failed to get public URL for uploaded QR code")
    }

    return urlData.publicUrl
  } catch (error) {
    console.error("Error uploading QR code:", error)
    throw error
  }
}

/**
 * Delete QR code from Supabase Storage
 * @param qrCodeUrl Public URL of the QR code to delete
 */
export async function deleteQRCode(qrCodeUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const url = new URL(qrCodeUrl)
    const pathParts = url.pathname.split("/")
    const fileName = pathParts[pathParts.length - 1]
    const filePath = `qr-codes/${fileName}`

    // Use server-side client for deletions (bypasses RLS if using service role key)
    const supabaseServer = getSupabaseServer()

    const { error } = await supabaseServer.storage.from("tickets").remove([filePath])

    if (error) {
      console.error("Error deleting QR code:", error)
      // Don't throw - deletion is not critical
    }
  } catch (error) {
    console.error("Error deleting QR code:", error)
    // Don't throw - deletion is not critical
  }
}
