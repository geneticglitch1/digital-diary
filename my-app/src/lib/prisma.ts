import { PrismaClient } from "@prisma/client"

declare global {
  // allow global `var` declarations for the dev hot-reload case
  // eslint-disable-next-line vars-on-top, no-var
  var prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  global.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") global.prisma = prisma

export default prisma
