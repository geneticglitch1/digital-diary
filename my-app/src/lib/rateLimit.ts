/**
 * In-memory rate limiter (sliding window).
 * For multi-instance production, replace with Redis-backed store (e.g. @upstash/ratelimit).
 */

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
}

interface WindowEntry {
  timestamps: number[]
}

const store = new Map<string, WindowEntry>()

/** Remove timestamps outside the current window (older than now - windowMs) */
function prune(entry: WindowEntry, windowMs: number, now: number): void {
  const cutoff = now - windowMs
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
}

/**
 * Check rate limit for a given identifier (e.g. IP or userId).
 * Returns result with success false when limit exceeded; retryAfterSeconds is seconds until a slot frees.
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowSeconds } = options
  const windowMs = windowSeconds * 1000
  const now = Date.now()

  let entry = store.get(identifier)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(identifier, entry)
  }

  prune(entry, windowMs, now)

  const remaining = Math.max(0, limit - entry.timestamps.length)
  const success = entry.timestamps.length < limit

  if (success) {
    entry.timestamps.push(now)
  }

  // When can the user retry? Oldest timestamp in window + windowMs
  const oldestInWindow = entry.timestamps[0] ?? now
  const resetAt = oldestInWindow + windowMs
  const retryAfterSeconds = success ? 0 : Math.ceil((resetAt - now) / 1000)

  return {
    success,
    remaining: success ? remaining - 1 : 0,
    resetAt,
    retryAfterSeconds,
  }
}

/** Get client IP from request (works behind proxies) */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "unknown"
}

/** Default: 120 requests per minute per IP for general API */
export const DEFAULT_API_RATE_LIMIT: RateLimitOptions = {
  limit: 120,
  windowSeconds: 60,
}

/** Stricter: auth endpoints (signup/signin) */
export const AUTH_RATE_LIMIT: RateLimitOptions = {
  limit: 15,
  windowSeconds: 60,
}

/** Upload endpoints */
export const UPLOAD_RATE_LIMIT: RateLimitOptions = {
  limit: 30,
  windowSeconds: 60,
}
