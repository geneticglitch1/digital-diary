import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isGoogleCalendarConnected } from "@/lib/googleCalendar"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const connected = await isGoogleCalendarConnected(session.user.id)

    return NextResponse.json({ connected })
  } catch (error) {
    console.error("Error checking calendar connection:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

