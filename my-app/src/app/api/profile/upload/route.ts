import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("profilePicture") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." 
      }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Please upload an image smaller than 5MB." 
      }, { status: 400 })
    }

    // Get current user to check for existing profile picture
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profilePicture: true }
    })

    // Create uploads directory if it doesn't exist
    // Ensure we're saving to the public folder so files are accessible
    const uploadsDir = join(process.cwd(), "public", "uploads", "profiles")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Sanitize file extension - only allow safe extensions
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"]
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ 
        error: "Invalid file extension. Please upload a JPEG, PNG, GIF, or WebP image." 
      }, { status: 400 })
    }

    // Generate unique filename
    const fileName = `${session.user.id}-${Date.now()}.${fileExtension}`
    const filePath = join(uploadsDir, fileName)

    // Convert file to buffer and save to public folder
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Generate public URL (files in public folder are served at root)
    const publicUrl = `/uploads/profiles/${fileName}`

    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { profilePicture: publicUrl },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
        journalEntriesCount: true,
        privateEntriesCount: true,
        publicEntriesCount: true,
        protectedEntriesCount: true,
      }
    })

    // Clean up old profile picture if it exists and is different
    if (currentUser?.profilePicture && currentUser.profilePicture !== publicUrl) {
      // Extract filename from the old URL
      const oldFileName = currentUser.profilePicture.split('/').pop()
      if (oldFileName) {
        const oldFilePath = join(uploadsDir, oldFileName)
        try {
          // Only delete if it exists and belongs to this user
          if (existsSync(oldFilePath) && oldFileName.startsWith(session.user.id)) {
            await unlink(oldFilePath)
          }
        } catch (error) {
          // Log but don't fail the request if cleanup fails
          console.error("Error deleting old profile picture:", error)
        }
      }
    }

    return NextResponse.json({
      message: "Profile picture uploaded successfully",
      profilePicture: publicUrl,
      user: updatedUser
    })
  } catch (error) {
    console.error("Error uploading profile picture:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
