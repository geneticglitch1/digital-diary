"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

interface SearchUser {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  profilePicture: string | null
}

function displayName(user: SearchUser): string {
  const first = user.firstName?.trim()
  const last = user.lastName?.trim()

  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return user.username
}

function initials(user: SearchUser): string {
  const first = user.firstName?.trim()
  const last = user.lastName?.trim()

  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first[0].toUpperCase()
  if (last) return last[0].toUpperCase()
  return user.username[0]?.toUpperCase() || "U"
}

export default function UsersSearchPage() {
  const { status } = useSession()
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const trimmedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setUsers([])
      setError("")
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError("")

      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(trimmedQuery)}&take=20`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Failed to search users")
        }

        const data = await response.json()
        setUsers(Array.isArray(data.users) ? data.users : [])
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message || "Failed to search users")
          setUsers([])
        }
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmedQuery])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="glass-strong rounded-3xl px-8 py-6">
          <div className="text-[#1a4d3e] font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      <nav className="glass-strong sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="glass rounded-2xl px-4 py-2 text-sm text-[#1a4d3e] hover:bg-white/40 transition-all"
              >
                Back
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1a4d3e] to-[#4A90E2] bg-clip-text text-transparent">
                Find People
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 space-y-6">
          <div className="panel-soft p-6">
            <label htmlFor="user-search" className="block text-sm font-medium text-[#1a4d3e] mb-2">
              Search by username or name
            </label>
            <input
              id="user-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type at least 2 characters..."
              className="w-full rounded-xl border border-white/50 bg-white/70 px-4 py-3 text-[#1a4d3e] placeholder-[#1a4d3e]/50 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
            />
            <p className="mt-2 text-xs text-[#1a4d3e]/70">
              Results update while you type.
            </p>
          </div>

          {error && (
            <div className="glass-strong rounded-2xl p-4 border-2 border-red-200/60 text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="panel-soft p-8 text-center text-[#1a4d3e]">Searching...</div>
          ) : trimmedQuery.length < 2 ? (
            <div className="panel-soft p-8 text-center text-[#1a4d3e]/80">
              Enter at least 2 characters to search.
            </div>
          ) : users.length === 0 ? (
            <div className="panel-soft p-8 text-center text-[#1a4d3e]/80">
              No users found.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="panel-soft p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4A90E2] to-[#52C9A2] text-white font-semibold flex items-center justify-center overflow-hidden">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={displayName(user)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{initials(user)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a4d3e]">{displayName(user)}</p>
                      <p className="text-sm text-[#1a4d3e]/70">@{user.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
