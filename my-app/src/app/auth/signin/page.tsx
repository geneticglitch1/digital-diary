"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid credentials")
      } else {
        // Check if sign in was successful
        const session = await getSession()
        if (session) {
          router.push("/")
          router.refresh()
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-md w-full space-y-8">
        <div className="panel-soft p-8 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#1a4d3e] to-[#4A90E2] bg-clip-text text-transparent">
            Sign in to your account
          </h2>
          <p className="mt-3 text-sm text-[#1a4d3e]/70">
            Or{" "}
            <Link
              href="/auth/signup"
              className="font-semibold text-[#4A90E2] hover:text-[#5BA3F5] transition-colors"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="panel-soft p-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1a4d3e] mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="glass w-full px-4 py-3 rounded-2xl border border-white/30 placeholder-[#1a4d3e]/50 text-[#1a4d3e] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2] sm:text-sm transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1a4d3e] mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="glass w-full px-4 py-3 rounded-2xl border border-white/30 placeholder-[#1a4d3e]/50 text-[#1a4d3e] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2] sm:text-sm transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="glass rounded-2xl p-4 border-2 border-red-200/50">
              <p className="text-red-700 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-glossy w-full flex justify-center py-3 px-4 text-sm font-medium rounded-2xl text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
