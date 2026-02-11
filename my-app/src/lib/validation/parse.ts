import { NextResponse } from "next/server"
import { z, ZodSchema } from "zod"

/**
 * Parse and validate JSON body with schema. Rejects unknown keys (strict).
 * Returns NextResponse with 400 and error message on failure.
 */
export function parseBody<T>(
  body: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const first = result.error.flatten().formErrors[0] ?? result.error.issues[0]?.message ?? "Invalid request"
  const message = typeof first === "string" ? first : "Validation failed"
  return {
    success: false,
    response: NextResponse.json(
      { error: message },
      { status: 400 }
    ),
  }
}

/**
 * Parse and validate query/search params with schema.
 */
export function parseQuery<T>(
  params: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(params)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const first = result.error.flatten().formErrors[0] ?? result.error.issues[0]?.message ?? "Invalid request"
  const message = typeof first === "string" ? first : "Invalid parameters"
  return {
    success: false,
    response: NextResponse.json(
      { error: message },
      { status: 400 }
    ),
  }
}

/**
 * Validate resource ID (e.g. entry id). Returns 400 response if invalid.
 */
export function parseResourceId(
  id: string | undefined,
  schema: ZodSchema<string>
): { success: true; id: string } | { success: false; response: NextResponse } {
  const result = schema.safeParse(id)
  if (result.success) {
    return { success: true, id: result.data }
  }
  return {
    success: false,
    response: NextResponse.json(
      { error: "Invalid resource id" },
      { status: 400 }
    ),
  }
}
