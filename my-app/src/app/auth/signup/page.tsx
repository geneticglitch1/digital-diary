"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignUp() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "An error occurred")
      } else {
        setSuccess("Account created successfully! Signing you in...")
        
        // Automatically sign in the user after successful registration
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        })

        if (signInResult?.error) {
          setError("Account created but failed to sign in. Please try signing in manually.")
        } else {
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
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#1a4d3e] to-[#4A90E2] bg-clip-text text-transparent">
            Create your account
          </h2>
          <p className="mt-3 text-sm text-[#1a4d3e]/70">
            Or{" "}
            <Link
              href="/auth/signin"
              className="font-semibold text-[#4A90E2] hover:text-[#5BA3F5] transition-colors"
            >
              sign in to your existing account
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
              <label htmlFor="username" className="block text-sm font-medium text-[#1a4d3e] mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="glass w-full px-4 py-3 rounded-2xl border border-white/30 placeholder-[#1a4d3e]/50 text-[#1a4d3e] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2] sm:text-sm transition-all"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                autoComplete="new-password"
                required
                className="glass w-full px-4 py-3 rounded-2xl border border-white/30 placeholder-[#1a4d3e]/50 text-[#1a4d3e] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2] sm:text-sm transition-all"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1a4d3e] mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="glass w-full px-4 py-3 rounded-2xl border border-white/30 placeholder-[#1a4d3e]/50 text-[#1a4d3e] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2] sm:text-sm transition-all"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="glass rounded-2xl p-4 border-2 border-red-200/50">
              <p className="text-red-700 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="glass rounded-2xl p-4 border-2 border-green-200/50">
              <p className="text-green-700 text-sm text-center font-medium">{success}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-glossy w-full flex justify-center py-3 px-4 text-sm font-medium rounded-2xl text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
