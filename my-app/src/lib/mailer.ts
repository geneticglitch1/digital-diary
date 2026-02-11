import nodemailer from "nodemailer"

type MailOptions = {
  to: string
  subject: string
  text?: string
  html?: string
}

export async function sendMail(opts: MailOptions) {
  // If SMTP is configured, send via SMTP. Otherwise, log the message to the server console (dev fallback).
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (host && port && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    })

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `no-reply@${process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "") || "localhost"}`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    })

    console.log("Sent mail:", info.messageId)
    return info
  }

  // Fallback: log reset URL for development or when SMTP is not configured
  console.log("Mail fallback - not sent (SMTP not configured). Message:", opts)
  return null
}

export default sendMail
