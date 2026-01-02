import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account, profile, email }) {
      // If signing in with Google OAuth
      if (account?.provider === "google" && user.email) {
        // Check if a user with this email already exists (from credentials signup)
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        
        if (existingUser) {
          // Link Google account to existing user instead of creating new one
          const existingAccount = await prisma.account.findFirst({
            where: {
              provider: "google",
              providerAccountId: account.providerAccountId,
              userId: existingUser.id,
            },
          })
          
          if (!existingAccount) {
            // Create account link
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })
          }
          
          // Update user object to use existing user ID
          user.id = existingUser.id
          user.username = existingUser.username
          user.firstName = existingUser.firstName
          user.lastName = existingUser.lastName
          user.profilePicture = existingUser.profilePicture
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.sub = user.id
        token.username = (user as any).username || ""
        token.firstName = (user as any).firstName || null
        token.lastName = (user as any).lastName || null
        token.profilePicture = (user as any).profilePicture || null
      }
      
      // If session is being updated, fetch fresh user data from database
      if (trigger === "update" && token.sub) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
              email: true,
            }
          })
          
          if (freshUser) {
            token.username = freshUser.username
            token.firstName = freshUser.firstName
            token.lastName = freshUser.lastName
            token.profilePicture = freshUser.profilePicture
          }
        } catch (error) {
          console.error("Error fetching fresh user data:", error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.username = token.username as string
        session.user.firstName = token.firstName as string | null
        session.user.lastName = token.lastName as string | null
        session.user.profilePicture = token.profilePicture as string | null
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
}
