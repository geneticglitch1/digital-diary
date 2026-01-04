import Anthropic from "@anthropic-ai/sdk"
import { CalendarEvent, fetchCalendarEvents } from "./googleCalendar"

// Rating categories based on qualityScore (1-10)
export type RatingCategory = "low" | "medium" | "high"

export interface JournalQuestion {
  text: string
  category?: string // Event category if applicable
}

/**
 * Maps qualityScore (1-10) to rating category
 */
export function getRatingCategory(qualityScore: number | null | undefined): RatingCategory {
  if (!qualityScore) return "medium" // Default to medium if no rating
  
  if (qualityScore >= 8) return "high"
  if (qualityScore >= 4) return "medium"
  return "low"
}

/**
 * Detects event type from event summary/description
 */
function detectEventType(event: CalendarEvent): string {
  const summary = (event.summary || "").toLowerCase()
  const description = (event.description || "").toLowerCase()
  const text = `${summary} ${description}`

  if (/\b(exam|test|quiz|midterm|final|assessment)\b/.test(text)) {
    return "exam"
  }
  if (/\b(meeting|standup|sync|conference)\b/.test(text)) {
    return "meeting"
  }
  if (/\b(workout|gym|exercise|fitness|run|yoga|pilates|cycling|swim)\b/.test(text)) {
    return "workout"
  }
  if (/\b(appointment|doctor|dentist|therapy|counseling|checkup|consultation)\b/.test(text)) {
    return "appointment"
  }
  
  return "other"
}

/**
 * Gets today's date range in ISO format
 */
function getTodayDateRange(): { timeMin: string; timeMax: string } {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  
  return {
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString()
  }
}

/**
 * Predefined question templates for common event types
 */
function getEventQuestions(
  eventType: string,
  eventTitle: string,
  rating: RatingCategory
): JournalQuestion[] {
  const questions: JournalQuestion[] = []

  switch (eventType) {
    case "exam":
      if (rating === "high") {
        questions.push({
          text: `What went well in your ${eventTitle}? What study strategies worked for you?`,
          category: "exam"
        })
        questions.push({
          text: `How did you prepare for the ${eventTitle}? What would you want to remember for next time?`,
          category: "exam"
        })
      } else if (rating === "low") {
        questions.push({
          text: `What was challenging about the ${eventTitle}? What support do you need?`,
          category: "exam"
        })
        questions.push({
          text: `What did you learn from this experience? How can you approach similar situations differently?`,
          category: "exam"
        })
      } else {
        questions.push({
          text: `How did the ${eventTitle} go? What parts went well and what was difficult?`,
          category: "exam"
        })
        questions.push({
          text: `What topics from the ${eventTitle} would you like to review or understand better?`,
          category: "exam"
        })
      }
      break

    case "meeting":
      if (rating === "high") {
        questions.push({
          text: `What were the key takeaways from ${eventTitle}? What made it productive?`,
          category: "meeting"
        })
        questions.push({
          text: `What action items or next steps came from ${eventTitle}? How do you feel about them?`,
          category: "meeting"
        })
      } else if (rating === "low") {
        questions.push({
          text: `What was challenging about ${eventTitle}? How did it make you feel?`,
          category: "meeting"
        })
        questions.push({
          text: `What would have made ${eventTitle} more productive or supportive for you?`,
          category: "meeting"
        })
      } else {
        questions.push({
          text: `What were the main points discussed in ${eventTitle}?`,
          category: "meeting"
        })
        questions.push({
          text: `How do you feel about the outcomes of ${eventTitle}?`,
          category: "meeting"
        })
      }
      break

    case "workout":
      if (rating === "high") {
        questions.push({
          text: `How did your ${eventTitle} feel? What made it great?`,
          category: "workout"
        })
        questions.push({
          text: `What goals did you achieve during ${eventTitle}? What do you want to repeat?`,
          category: "workout"
        })
      } else if (rating === "low") {
        questions.push({
          text: `How are you feeling after ${eventTitle}? What made it challenging?`,
          category: "workout"
        })
        questions.push({
          text: `What do you need to recover or feel better? How can you adjust your approach?`,
          category: "workout"
        })
      } else {
        questions.push({
          text: `How did your ${eventTitle} go? What felt good and what was difficult?`,
          category: "workout"
        })
        questions.push({
          text: `What would you like to improve for your next ${eventTitle}?`,
          category: "workout"
        })
      }
      break

    case "appointment":
      if (rating === "high") {
        questions.push({
          text: `How did your ${eventTitle} go? What was discussed and what were the outcomes?`,
          category: "appointment"
        })
        questions.push({
          text: `What positive insights or next steps came from ${eventTitle}?`,
          category: "appointment"
        })
      } else if (rating === "low") {
        questions.push({
          text: `What happened during ${eventTitle}? What concerns or challenges came up?`,
          category: "appointment"
        })
        questions.push({
          text: `What support or resources do you need following ${eventTitle}?`,
          category: "appointment"
        })
      } else {
        questions.push({
          text: `What was discussed during ${eventTitle}? How are you feeling about it?`,
          category: "appointment"
        })
        questions.push({
          text: `What follow-up actions or next steps do you have from ${eventTitle}?`,
          category: "appointment"
        })
      }
      break

    default:
      // Generic questions for other event types
      if (rating === "high") {
        questions.push({
          text: `What made ${eventTitle} go well? What would you want to remember?`,
          category: "general"
        })
      } else if (rating === "low") {
        questions.push({
          text: `What happened during ${eventTitle}? How are you feeling about it?`,
          category: "general"
        })
      } else {
        questions.push({
          text: `How did ${eventTitle} go? What stood out to you?`,
          category: "general"
        })
      }
  }

  return questions
}

/**
 * Generates personalized questions using Claude API for complex events
 */
async function generateClaudeQuestions(
  event: CalendarEvent,
  rating: RatingCategory,
  qualityScore: number | null
): Promise<JournalQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set")
    return getEventQuestions("other", event.summary, rating)
  }

  const anthropic = new Anthropic({ apiKey })

  // Build context for Claude
  const ratingContext = {
    high: "The user had a good day (rating 8-10). Focus on what went well, what made it great, and what they want to repeat.",
    medium: "The user had an okay day (rating 4-7). Ask balanced questions about both highs and lows, and what could improve.",
    low: "The user had a challenging day (rating 1-3). Ask supportive questions about challenges, what they learned, and how to cope."
  }

  const prompt = `You are a thoughtful journaling assistant. Generate 2-3 personalized, reflective journal questions based on the user's calendar event and day rating.

Event Details:
- Title: ${event.summary}
${event.description ? `- Description: ${event.description.substring(0, 300)}` : ""}
${event.location ? `- Location: ${event.location}` : ""}
${event.start.dateTime ? `- Time: ${new Date(event.start.dateTime).toLocaleString()}` : ""}

Day Rating Context:
${ratingContext[rating]}
${qualityScore ? `Specific rating: ${qualityScore}/10` : ""}

Instructions:
- Generate 2-3 questions that are personalized to this specific event
- Adjust the tone and focus based on the rating: ${rating === "high" ? "celebratory and positive" : rating === "low" ? "supportive and gentle" : "balanced and reflective"}
- Make questions specific to the event (mention the event title naturally)
- Questions should encourage deep reflection
- For low ratings, be supportive and focus on learning/coping
- For high ratings, focus on what went well and repetition
- For medium ratings, balance both perspectives

Return only the questions, one per line, without numbering or bullet points.`

  try {
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
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.match(/^\d+[.)]/)) // Remove empty lines and numbered lists
        .slice(0, 3) // Limit to 3 questions
        .map(text => ({
          text: text.replace(/^[-•*]\s*/, ""), // Remove bullet points
          category: "claude-generated"
        }))
      
      return questions.length > 0 ? questions : getEventQuestions("other", event.summary, rating)
    }
  } catch (error) {
    console.error("Error generating questions with Claude:", error)
    // Fallback to template questions
  }

  return getEventQuestions("other", event.summary, rating)
}

/**
 * Gets questions about calendar events attendance and busyness
 */
function getBusynessQuestions(eventsCount: number, rating: RatingCategory): JournalQuestion[] {
  const questions: JournalQuestion[] = []

  if (eventsCount > 0) {
    if (rating === "high") {
      questions.push({
        text: `You had ${eventsCount} event${eventsCount > 1 ? 's' : ''} scheduled today. Did you attend all of them? How did you manage your busy schedule?`,
        category: "busyness"
      })
    } else if (rating === "low") {
      questions.push({
        text: `You had ${eventsCount} event${eventsCount > 1 ? 's' : ''} scheduled today. How did you prioritize your time? What did you skip or postpone?`,
        category: "busyness"
      })
    } else {
      questions.push({
        text: `You had ${eventsCount} event${eventsCount > 1 ? 's' : ''} scheduled today. Did you attend all of them? How busy did today feel?`,
        category: "busyness"
      })
    }
  }

  return questions
}

/**
 * Gets questions about physical activity
 */
function getActivityQuestions(rating: RatingCategory): JournalQuestion[] {
  const questions: JournalQuestion[] = []

  if (rating === "high") {
    questions.push({
      text: "How active were you today? What physical activities did you engage in?",
      category: "activity"
    })
  } else if (rating === "low") {
    questions.push({
      text: "How did you feel physically today? Were you able to stay active, or did you need more rest?",
      category: "activity"
    })
  } else {
    questions.push({
      text: "How active were you today? Did you get enough movement and exercise?",
      category: "activity"
    })
  }

  return questions
}

/**
 * Gets questions about social interactions
 */
function getSocialQuestions(rating: RatingCategory): JournalQuestion[] {
  const questions: JournalQuestion[] = []

  if (rating === "high") {
    questions.push({
      text: "Who did you meet or interact with today? What relationships did you nurture?",
      category: "social"
    })
    questions.push({
      text: "What social interactions stood out to you? How did they make you feel?",
      category: "social"
    })
  } else if (rating === "low") {
    questions.push({
      text: "Who did you connect with today? How did social interactions affect your day?",
      category: "social"
    })
  } else {
    questions.push({
      text: "Who did you meet or spend time with today? What's your relationship with them?",
      category: "social"
    })
  }

  return questions
}

/**
 * Gets questions about places visited and time spent indoors/outdoors
 */
function getLocationQuestions(rating: RatingCategory): JournalQuestion[] {
  const questions: JournalQuestion[] = []

  if (rating === "high") {
    questions.push({
      text: "What places did you visit today? How much time did you spend outdoors versus indoors?",
      category: "locations"
    })
    questions.push({
      text: "Which location from today would you want to revisit? What made it special?",
      category: "locations"
    })
  } else if (rating === "low") {
    questions.push({
      text: "Where did you spend most of your time today? How did the places you visited affect your mood?",
      category: "locations"
    })
  } else {
    questions.push({
      text: "What places did you travel to today? How did you divide your time between indoor and outdoor spaces?",
      category: "locations"
    })
  }

  return questions
}

/**
 * Gets general questions based on day rating
 */
function getGeneralQuestions(rating: RatingCategory): JournalQuestion[] {
  const questions: JournalQuestion[] = []

  if (rating === "high") {
    questions.push({
      text: "What made today great? What moments brought you joy or satisfaction?",
      category: "general"
    })
    questions.push({
      text: "What do you want to remember about today? What would you like to repeat?",
      category: "general"
    })
  } else if (rating === "low") {
    questions.push({
      text: "What challenges did you face today? How did you handle them?",
      category: "general"
    })
    questions.push({
      text: "What did you learn about yourself today? What support do you need?",
      category: "general"
    })
  } else {
    questions.push({
      text: "What were the highlights and lowlights of your day?",
      category: "general"
    })
    questions.push({
      text: "What could have made today better? What are you grateful for?",
      category: "general"
    })
  }

  return questions
}

/**
 * Main function to generate personalized journal questions
 */
export async function generateJournalQuestions(
  userId: string,
  qualityScore: number | null | undefined
): Promise<JournalQuestion[]> {
  const rating = getRatingCategory(qualityScore)
  const allQuestions: JournalQuestion[] = []

  try {
    // Get today's calendar events
    const { timeMin, timeMax } = getTodayDateRange()
    const events = await fetchCalendarEvents(userId, timeMin, timeMax, 20)

    if (events.length === 0) {
      // No events today - return general questions + activity/social/location questions
      const questions: JournalQuestion[] = []
      
      // Add activity, social, and location questions
      questions.push(...getActivityQuestions(rating).slice(0, 1))
      questions.push(...getSocialQuestions(rating).slice(0, 1))
      questions.push(...getLocationQuestions(rating).slice(0, 1))
      questions.push(...getGeneralQuestions(rating).slice(0, 2))
      
      return questions.slice(0, 10)
    }

    // Process each event
    const commonEventTypes = ["exam", "meeting", "workout", "appointment"]
    let claudeCallCount = 0
    const MAX_CLAUDE_CALLS = 3 // Limit Claude API calls to avoid rate limits and costs
    
    for (const event of events) {
      // Stop processing if we already have enough questions
      if (allQuestions.length >= 8) break

      const eventType = detectEventType(event)
      
      if (commonEventTypes.includes(eventType)) {
        // Use predefined templates
        const questions = getEventQuestions(eventType, event.summary, rating)
        allQuestions.push(...questions)
      } else {
        // Use Claude API for complex/other events (limit to prevent too many API calls)
        if (claudeCallCount < MAX_CLAUDE_CALLS) {
          try {
            const questions = await generateClaudeQuestions(event, rating, qualityScore || null)
            allQuestions.push(...questions)
            claudeCallCount++
          } catch (error) {
            console.error(`Error generating Claude questions for event ${event.summary}:`, error)
            // Fallback to template questions if Claude fails
            const fallbackQuestions = getEventQuestions("other", event.summary, rating)
            allQuestions.push(...fallbackQuestions)
          }
        } else {
          // Use template questions if we've hit the Claude API limit
          const questions = getEventQuestions("other", event.summary, rating)
          allQuestions.push(...questions)
        }
      }
    }

    // Add questions about busyness (calendar events attendance)
    const busynessQuestions = getBusynessQuestions(events.length, rating)
    allQuestions.push(...busynessQuestions)

    // Add questions about activity level
    const activityQuestions = getActivityQuestions(rating)
    allQuestions.push(...activityQuestions.slice(0, 1))

    // Add questions about social interactions
    const socialQuestions = getSocialQuestions(rating)
    allQuestions.push(...socialQuestions.slice(0, 1))

    // Add questions about places and locations
    const locationQuestions = getLocationQuestions(rating)
    allQuestions.push(...locationQuestions.slice(0, 1))

    // Add 1-2 general questions based on rating (limit total questions)
    const generalQuestions = getGeneralQuestions(rating)
    allQuestions.push(...generalQuestions.slice(0, 1))

    // Deduplicate and limit total questions (max 15 to accommodate new question types)
    const uniqueQuestions = Array.from(
      new Map(allQuestions.map(q => [q.text, q])).values()
    ).slice(0, 15)

    return uniqueQuestions

  } catch (error) {
    console.error("Error generating journal questions:", error)
    
    // Fallback to general questions if there's an error
    return getGeneralQuestions(rating)
  }
}

