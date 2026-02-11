"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function ResetPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""
  const email = params.get("email") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    setMessage("")
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    if (password !== confirm) {
      setMessage("Passwords do not match")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (res.ok) {
        setMessage("Password reset. You can now sign in.")
        setTimeout(() => router.push("/auth/signin"), 1200)
      } else {
        setMessage(data?.error || "Failed to reset password")
      }
    } catch (err) {
      setMessage("Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="panel-soft p-8 text-center">
          <h2 className="text-2xl font-bold">Reset your password</h2>
        </div>

        <form className="panel-soft p-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1a4d3e] mb-2">New password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass w-full px-4 py-3 rounded-2xl"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-[#1a4d3e] mb-2">Confirm password</label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="glass w-full px-4 py-3 rounded-2xl"
            />
          </div>

          {message && <div className="text-sm text-[#1a4d3e]/70">{message}</div>}

          <div>
            <button disabled={loading} className="btn-glossy w-full py-3 rounded-2xl">
              {loading ? "Saving..." : "Reset password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
