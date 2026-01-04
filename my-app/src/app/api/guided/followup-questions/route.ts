import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { prompts, responses, mood } = body

    if (!prompts || !responses || !Array.isArray(prompts) || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "Prompts and responses arrays are required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    // Build context from user's responses
    const responsesContext = prompts
      .map((prompt: string, index: number) => {
        const response = responses[index] || ""
        if (!response.trim()) return null
        return `Q: ${prompt}\nA: ${response}`
      })
      .filter(Boolean)
      .join("\n\n")

    if (!responsesContext) {
      return NextResponse.json(
        { error: "No valid responses provided" },
        { status: 400 }
      )
    }

    const moodContext = mood ? `The user's current mood is: ${mood}` : ""

    const prompt = `You are a thoughtful journaling assistant. Based on the user's journal responses, generate 2-4 personalized, deep follow-up questions that will help them explore their thoughts and feelings more deeply.

${moodContext}

User's Journal Responses:
${responsesContext}

Instructions:
- Generate 2-4 follow-up questions that are personalized based on what the user shared
- Questions should dive deeper into themes, emotions, or experiences mentioned in their responses
- Ask about patterns, deeper meanings, or connections
- Be empathetic and supportive
- Questions should encourage reflection and self-discovery
- Avoid repeating the original questions
- Make questions specific to what they shared, not generic
- If they mentioned challenges, ask about coping strategies or support needs
- If they mentioned positive experiences, ask about what made them meaningful

Return only the questions, one per line, without numbering or bullet points.`

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })

    const content = message.content[0]
    if (content.type === "text") {
      const questions = content.text
        .split("\n")
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0 && !q.match(/^\d+[.)]/)) // Remove empty lines and numbered lists
        .slice(0, 4) // Limit to 4 questions
        .map((text: string) => text.replace(/^[-•*]\s*/, "")) // Remove bullet points
        .filter((q: string) => q.length > 0)
      
      return NextResponse.json({ 
        questions: questions.length > 0 ? questions : [],
        count: questions.length
      })
    }

    return NextResponse.json(
      { error: "Failed to generate questions", questions: [] },
      { status: 500 }
    )
  } catch (error: any) {
    console.error("Error generating follow-up questions:", error)
    const errorMessage = error?.message || error?.toString() || "Unknown error"
    return NextResponse.json(
      { 
        error: `Failed to generate follow-up questions: ${errorMessage}`,
        questions: []
      },
      { status: 500 }
    )
  }
}

