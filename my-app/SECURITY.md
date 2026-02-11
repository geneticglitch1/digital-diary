# Security

## API keys and secrets

- **Never hard-code API keys or secrets.** All sensitive values are read from environment variables.
- **Server-only:** `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `DATABASE_URL` are used only in server code (API routes, `src/lib/*`). They are never sent to the client.
- Next.js exposes only variables prefixed with `NEXT_PUBLIC_` to the browser. Do not use that prefix for secrets.
- Use a `.env.local` (or your deployment’s env config) and ensure `.env*.local` is in `.gitignore`. Do not commit `.env` files that contain real secrets.

## Rate limiting

- **IP-based** rate limiting is applied in middleware to all `/api/*` requests:
  - **Auth** (`/api/auth/*`): 15 requests per minute per IP.
  - **Upload** (`/api/media/upload`, `/api/profile/upload`): 30 requests per minute per IP.
  - **All other API**: 120 requests per minute per IP.
- When the limit is exceeded, the API returns **429 Too Many Requests** with:
  - JSON body: `{ error: "Too many requests...", retryAfter: <seconds> }`
  - Header: `Retry-After: <seconds>`
  - Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Rate limit state is stored in memory. For multiple instances or production at scale, replace with a shared store (e.g. Redis) in `src/lib/rateLimit.ts`.

## Input validation and sanitization

- All API request bodies and query parameters are validated with **Zod** schemas in `src/lib/validation/schemas.ts`.
- Schemas use **strict** mode: unknown fields are rejected (no mass assignment).
- Enforced limits include: length limits on strings, numeric ranges, array sizes, and type checks. See schemas for exact limits (e.g. email length, username length, content size, URL count).
- Resource IDs (e.g. entry `id`) are validated (format and length) before use in DB queries.
- Validation failures return **400 Bad Request** with a single, safe error message.

## Security headers (OWASP)

- Applied globally via `next.config.ts`:
  - **X-Content-Type-Options: nosniff** – prevents MIME sniffing.
  - **X-Frame-Options: DENY** – reduces clickjacking risk.
  - **X-XSS-Protection: 1; mode=block** – legacy XSS filter.
  - **Referrer-Policy: strict-origin-when-cross-origin** – limits referrer data.
  - **Permissions-Policy** – restricts camera, microphone, geolocation.

## OWASP alignment

- **A01 Broken Access Control:** Auth required via NextAuth; entry/profile access scoped to `session.user.id`; resource IDs validated.
- **A02 Cryptographic Failures:** Passwords hashed with bcrypt (cost 12); secrets in env only.
- **A03 Injection:** Prisma used with parameterized queries; input validated and constrained by schema.
- **A04 Insecure Design:** Rate limiting, validation, and security headers applied.
- **A05 Security Misconfiguration:** Security headers set; no debug/stack traces in production responses.
- **A07 Identification and Authentication Failures:** Auth endpoints rate limited; password length and complexity enforced at signup.
- **A08 Software and Data Integrity:** Dependencies from lockfile; no arbitrary script injection from client input.
- **A09 Logging and Monitoring:** Server errors logged; avoid logging sensitive data (passwords, tokens).

## File uploads

- Allowed types and extensions are allowlisted (images/videos for entries; images only for profile).
- File size limits enforced (e.g. 10MB images, 50MB videos for entries; 5MB for profile).
- Filenames are generated server-side (user id + timestamp + allowed extension); user-controlled names are not used for storage paths.
