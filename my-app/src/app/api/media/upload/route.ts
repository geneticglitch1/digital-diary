import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import sharp from "sharp"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("media") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type - allow images and videos
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, OGG, MOV)."
      }, { status: 400 })
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const isVideo = allowedVideoTypes.includes(file.type)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for videos, 10MB for images
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large. Please upload a file smaller than ${isVideo ? '50MB' : '10MB'}.`
      }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "entries")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Sanitize file extension - only allow safe extensions
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = isVideo
      ? ["mp4", "webm", "ogg", "mov"]
      : ["jpg", "jpeg", "png", "gif", "webp"]

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        error: `Invalid file extension. Please upload a ${isVideo ? 'video' : 'image'} file.`
      }, { status: 400 })
    }

    // Generate unique filename
    const fileName = `${session.user.id}-${Date.now()}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    let buffer = Buffer.from(bytes)

    // Strip EXIF data (and auto-orient) if it's an image
    if (!isVideo) {
      try {
        // Check if potentially animated (GIF, WebP)
        const isAnimated = ["gif", "webp"].includes(fileExtension || "")

        buffer = await sharp(buffer, { animated: isAnimated })
          .rotate() // Auto-orient based on EXIF before stripping
          .toBuffer() // Default behavior strips metadata
      } catch (error) {
        console.error("Error stripping EXIF data:", error)
        // Continue with original buffer if processing fails
      }
    }

    await writeFile(filePath, buffer)

    // Generate public URL (files in public folder are served at root)
    const publicUrl = `/uploads/entries/${fileName}`

    return NextResponse.json({
      url: publicUrl,
      type: file.type,
      size: file.size,
      message: "Media uploaded successfully"
    }, { status: 200 })
  } catch (error) {
    console.error("Error uploading media:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

