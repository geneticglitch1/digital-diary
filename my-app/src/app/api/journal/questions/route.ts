import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { generateJournalQuestions } from "@/lib/journalQuestions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const qualityScoreParam = searchParams.get("qualityScore")
    
    // Parse qualityScore (1-10) or default to null
    let qualityScore: number | null = null
    if (qualityScoreParam) {
      const parsed = parseInt(qualityScoreParam, 10)
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        qualityScore = parsed
      }
    }

    const questions = await generateJournalQuestions(session.user.id, qualityScore)

    return NextResponse.json({ 
      questions,
      count: questions.length
    })
  } catch (error: any) {
    console.error("Error generating journal questions:", error)
    
    if (error.message?.includes("not connected") || error.message?.includes("tokens missing")) {
      return NextResponse.json(
        { 
          error: "Google Calendar not connected. Questions generated without calendar events.",
          questions: [] // Return empty or fallback questions
        },
        { status: 200 } // Still return 200, but with error message
      )
    }

    return NextResponse.json(
      { 
        error: "Failed to generate questions",
        questions: []
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { qualityScore } = body

    // Validate qualityScore if provided (1-10)
    let validatedScore: number | null = null
    if (qualityScore !== undefined && qualityScore !== null) {
      const parsed = typeof qualityScore === "number" ? qualityScore : parseInt(String(qualityScore), 10)
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        validatedScore = parsed
      }
    }

    const questions = await generateJournalQuestions(session.user.id, validatedScore)

    return NextResponse.json({ 
      questions,
      count: questions.length
    })
  } catch (error: any) {
    console.error("Error generating journal questions:", error)
    
    if (error.message?.includes("not connected") || error.message?.includes("tokens missing")) {
      return NextResponse.json(
        { 
          error: "Google Calendar not connected. Questions generated without calendar events.",
          questions: []
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { 
        error: "Failed to generate questions",
        questions: []
      },
      { status: 500 }
    )
  }
}

