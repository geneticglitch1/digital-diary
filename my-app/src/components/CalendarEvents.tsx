"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signIn } from "next-auth/react"

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  htmlLink?: string
  status?: string
}

export default function CalendarEvents() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState("")

  const checkConnection = async () => {
    try {
      const response = await fetch("/api/calendar/connect")
      if (response.ok) {
        const data = await response.json()
        setConnected(data.connected)
      }
    } catch (error) {
      console.error("Error checking connection:", error)
    }
  }

  const fetchEvents = async () => {
    if (!session?.user?.id) return

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/calendar/events")
      if (!response.ok) {
        if (response.status === 401) {
          setConnected(false)
          setError("Google Calendar not connected")
          return
        }
        throw new Error("Failed to fetch events")
      }
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error("Error fetching events:", error)
      setError("Failed to load calendar events")
    } finally {
      setLoading(false)
    }
  }

  const syncEvents = useCallback(async () => {
    if (!session?.user?.id) return

    setSyncing(true)
    setError("")
    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxResults: 50,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setConnected(false)
          setError("Google Calendar not connected")
          return
        }
        throw new Error("Failed to sync events")
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error("Error syncing events:", error)
      setError("Failed to sync calendar events")
    } finally {
      setSyncing(false)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      checkConnection()
      fetchEvents()
    }
  }, [session])

  useEffect(() => {
    if (connected && session) {
      // Set up periodic sync every 5 minutes
      const syncInterval = setInterval(() => {
        syncEvents()
      }, 5 * 60 * 1000) // 5 minutes

      return () => clearInterval(syncInterval)
    }
  }, [connected, session, syncEvents])

  const connectGoogle = async () => {
    // Use signIn with redirect: false to handle in the same window
    // The signIn callback will link the account to the existing user
    await signIn("google", {
      callbackUrl: window.location.href,
      redirect: true,
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  if (!session) {
    return null
  }

  if (!connected) {
    return (
      <div className="panel-soft p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-2xl font-bold text-[#1a4d3e] mb-3">Connect Google Calendar</h3>
        <p className="text-[#1a4d3e]/70 mb-6">
          Connect your Google Calendar to view and sync your events
        </p>
        <button
          onClick={connectGoogle}
          className="btn-glossy rounded-2xl px-6 py-3 text-sm font-medium text-white"
        >
          Connect Google Calendar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-[#1a4d3e] to-[#4A90E2] bg-clip-text text-transparent">
            📅 Calendar Events
          </h3>
          <p className="text-sm text-[#1a4d3e]/70 mt-1">
            Your upcoming events from Google Calendar
          </p>
        </div>
        <button
          onClick={syncEvents}
          disabled={syncing}
          className="btn-glossy-green rounded-2xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "🔄 Sync"}
        </button>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 border-2 border-red-200/50">
          <p className="text-red-700 text-sm text-center font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="glass-strong rounded-3xl px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#4A90E2] border-t-transparent"></div>
              <div className="text-[#1a4d3e] font-medium">Loading events...</div>
            </div>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="panel-soft p-8 text-center">
          <div className="text-5xl mb-4">📆</div>
          <h4 className="text-lg font-medium text-[#1a4d3e] mb-2">No upcoming events</h4>
          <p className="text-[#1a4d3e]/60">
            You don't have any events scheduled in the next 30 days.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="panel-soft p-5 hover:scale-[1.02] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-[#1a4d3e] mb-2">
                    {event.summary}
                  </h4>
                  
                  <div className="space-y-1 text-sm text-[#1a4d3e]/70">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">📅</span>
                      <span>
                        {formatDate(event.start.dateTime || event.start.date)}
                        {event.start.dateTime && ` at ${formatTime(event.start.dateTime)}`}
                      </span>
                    </div>
                    
                    {event.end.dateTime || event.end.date ? (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">⏰</span>
                        <span>
                          Ends: {formatDate(event.end.dateTime || event.end.date)}
                          {event.end.dateTime && ` at ${formatTime(event.end.dateTime)}`}
                        </span>
                      </div>
                    ) : null}
                    
                    {event.location && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">📍</span>
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {event.description && (
                      <div className="mt-2 text-xs text-[#1a4d3e]/60 line-clamp-2">
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
                
                {event.htmlLink && (
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 glass rounded-xl px-3 py-2 text-xs font-medium text-[#1a4d3e] hover:bg-white/40 transition-all"
                  >
                    Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

