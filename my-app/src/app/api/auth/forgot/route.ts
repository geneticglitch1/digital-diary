import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { parseBody } from "@/lib/validation/parse"
import { forgotPasswordSchema } from "@/lib/validation/schemas"
import { sendMail } from "@/lib/mailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(body, forgotPasswordSchema)
    if (!parsed.success) return parsed.response

    const { email } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })

    // Always respond with success to avoid user enumeration
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Generate token and save in VerificationToken table
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })

    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

    // Send email (or log fallback)
    await sendMail({
      to: email,
      subject: "Reset your password",
      text: `Reset your password using this link: ${resetUrl}`,
      html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    }).catch((err) => console.error("Error sending reset email:", err))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
