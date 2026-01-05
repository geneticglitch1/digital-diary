import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { fetchCalendarEvents } from "@/lib/googleCalendar"
import { WeatherData } from "@/lib/weather"

function getTodayDateRange(): { timeMin: string; timeMax: string } {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  
  return {
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { prompts, responses, mood, weather } = body

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

    // Fetch today's calendar events
    let calendarEventsContext = ""
    let hasEvents = false
    let hasPastEvents = false
    let hasUpcomingEvents = false
    const now = new Date()
    
    try {
      const { timeMin, timeMax } = getTodayDateRange()
      const events = await fetchCalendarEvents(session.user.id, timeMin, timeMax, 20)
      
      if (events.length > 0) {
        hasEvents = true
        
        // Separate events into past and upcoming
        const pastEvents: string[] = []
        const upcomingEvents: string[] = []
        
        events.forEach((event, index) => {
          const eventStartTime = event.start.dateTime 
            ? new Date(event.start.dateTime)
            : event.start.date 
            ? new Date(event.start.date)
            : null
          
          const startTime = event.start.dateTime 
            ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : event.start.date || 'All day'
          const location = event.location ? ` at ${event.location}` : ''
          const description = event.description ? ` (${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''})` : ''
          
          const eventString = `${index + 1}. "${event.summary}" - ${startTime}${location}${description}`
          
          // Check if event has already occurred
          if (eventStartTime && eventStartTime < now) {
            pastEvents.push(eventString)
            hasPastEvents = true
          } else {
            upcomingEvents.push(eventString)
            hasUpcomingEvents = true
          }
        })
        
        // Build context with past and upcoming events clearly separated
        let eventsList = ""
        if (pastEvents.length > 0) {
          eventsList += `Past Events (already occurred today):\n${pastEvents.join('\n')}`
        }
        if (upcomingEvents.length > 0) {
          if (eventsList) eventsList += "\n\n"
          eventsList += `Upcoming Events (scheduled for later today):\n${upcomingEvents.join('\n')}`
        }
        
        calendarEventsContext = `\n\nToday's Calendar Events:\n${eventsList}\n\nIMPORTANT: Generate at least one question specifically about one or more of these exact calendar events. Reference the event name(s) and ask about specific details, feelings, or experiences related to those particular events.`
      }
    } catch (error) {
      // If calendar fetch fails, continue without calendar events
      console.error("Error fetching calendar events for follow-up questions:", error)
    }

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

    // Build weather context
    let weatherContext = ""
    let hasWeather = false
    if (weather && typeof weather === 'object') {
      const weatherData = weather as WeatherData
      if (weatherData.city && weatherData.condition) {
        hasWeather = true
        const tempStr = weatherData.temperature !== null ? `${weatherData.temperature}°F` : ''
        const weatherStr = [tempStr, weatherData.condition].filter(Boolean).join(', ')
        weatherContext = `\n\nToday's Weather in ${weatherData.city}${weatherData.state ? `, ${weatherData.state}` : ''}: ${weatherStr}${weatherData.description ? ` - ${weatherData.description}` : ''}`
      }
    }

    const prompt = `You are a thoughtful journaling assistant. Based on the user's journal responses, generate 2-4 personalized, deep follow-up questions that will help them explore their thoughts and feelings more deeply.

${moodContext}

User's Journal Responses:
${responsesContext}${calendarEventsContext}${weatherContext}

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
${hasEvents ? `- IMPORTANT: Include at least one question specifically about one or more of the exact calendar events listed above. Reference the event name(s) and ask about specific details, feelings, or experiences related to those particular events.
${hasPastEvents && hasUpcomingEvents ? '- For PAST events (already occurred), ask about how they went, what happened, memorable moments, or how they felt (e.g., "How did the [Event Name] go? What was the most memorable moment from it?").' : ''}
${hasPastEvents && !hasUpcomingEvents ? '- For PAST events (already occurred), ask about how they went, what happened, memorable moments, or how they felt (e.g., "How did the [Event Name] go? What was the most memorable moment from it?").' : ''}
${hasUpcomingEvents && hasPastEvents ? '- For UPCOMING events (scheduled for later), ask about anticipation, preparation, expectations, or feelings about the event (e.g., "How are you feeling about [Event Name] later? What are you looking forward to or concerned about?"). DO NOT ask questions that assume the event has already happened.' : ''}
${hasUpcomingEvents && !hasPastEvents ? '- For UPCOMING events (scheduled for later), ask about anticipation, preparation, expectations, or feelings about the event (e.g., "How are you feeling about [Event Name] later? What are you looking forward to or concerned about?"). DO NOT ask questions that assume the event has already happened, like "How was the event?" or "What happened at the event?"' : ''}` : ''}
${hasWeather ? '- IMPORTANT: Include at least one question about how the user\'s overall mood throughout the day correlated with the weather in their current city. Ask them to reflect on whether the weather conditions (temperature, conditions like sunny/rainy/cloudy) influenced their mood, energy levels, or activities. For example: "How did the [weather condition] weather in [city] today affect your mood? Did it influence how you felt or what you wanted to do?"' : ''}

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

