"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ForgotPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setMessage("If an account exists for that email, a reset link was sent.")
      } else {
        const data = await res.json().catch(() => ({} as any))
        setMessage(data?.error || "Failed to request password reset")
      }
    } catch (err) {
      setMessage("Failed to request password reset")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="panel-soft p-8 text-center">
          <h2 className="text-2xl font-bold">Forgot your password?</h2>
          <p className="text-sm text-[#1a4d3e]/70 mt-2">Enter your email and we'll send a reset link.</p>
        </div>

        <form className="panel-soft p-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1a4d3e] mb-2">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass w-full px-4 py-3 rounded-2xl"
            />
          </div>

          {message && <div className="text-sm text-[#1a4d3e]/70">{message}</div>}

          <div>
            <button disabled={loading} className="btn-glossy w-full py-3 rounded-2xl">
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
