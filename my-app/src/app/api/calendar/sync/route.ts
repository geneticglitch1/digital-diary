import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { fetchCalendarEvents } from "@/lib/googleCalendar"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const timeMin = body.timeMin || undefined
    const timeMax = body.timeMax || undefined
    const maxResults = body.maxResults || 50

    const events = await fetchCalendarEvents(session.user.id, timeMin, timeMax, maxResults)

    return NextResponse.json({ 
      success: true,
      events,
      syncedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("Error syncing calendar events:", error)
    
    if (error.message?.includes("not connected") || error.message?.includes("tokens missing")) {
      return NextResponse.json(
        { error: "Google Calendar not connected. Please connect your Google account." },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

