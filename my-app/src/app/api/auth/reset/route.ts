import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { parseBody } from "@/lib/validation/parse"
import { resetPasswordSchema } from "@/lib/validation/schemas"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = parseBody(body, resetPasswordSchema)
    if (!parsed.success) return parsed.response

    const { email, token, password } = parsed.data

    // Find token
    const vt = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    })

    if (!vt || vt.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    // Hash new password and update user
    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    // Remove used verification token(s)
    await prisma.verificationToken.deleteMany({ where: { identifier: email } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
