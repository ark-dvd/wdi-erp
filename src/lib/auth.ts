import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { prisma } from "./prisma"
// פונקציה פנימית לתיעוד - לא תלויה ב-auth()
async function logLogin(email: string, success: boolean, reason?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: { select: { name: true } } }
    })
    await prisma.activityLog.create({
      data: {
        userId: user?.id || null,
        userEmail: email,
        userRole: user?.role?.name || null,
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAIL',
        category: 'auth',
        module: 'auth',
        success,
        details: reason ? { reason } : undefined,
      }
    })
  } catch (error) {
    console.error('Login log error:', error)
  }
}
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        await logLogin('unknown', false, 'no_email')
        return false
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })
      
      if (!existingUser) {
        await logLogin(user.email, false, 'user_not_registered')
        return false
      }
      
      await prisma.user.update({
        where: { email: user.email },
        data: { 
          lastLogin: new Date(),
          name: user.name,
          image: user.image,
        },
      })
      // תיעוד כניסה מוצלחת
      await logLogin(user.email, true)
      
      return true
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            },
            employee: true,
          },
        })
        
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.role = dbUser.role.name
          session.user.roleDisplayName = dbUser.role.displayName
          session.user.employeeId = dbUser.employeeId
          session.user.permissions = dbUser.role.permissions.map(
            rp => `${rp.permission.module}:${rp.permission.action}`
          )
          if (dbUser.employee) {
            session.user.employeeName = `${dbUser.employee.firstName} ${dbUser.employee.lastName}`
            // המרת URL של GCS ל-proxy URL
            if (dbUser.employee.photoUrl) {
              session.user.employeePhoto = `/api/file?url=${encodeURIComponent(dbUser.employee.photoUrl)}`
            }
          }
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
})
declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      roleDisplayName?: string
      employeeId?: string | null
      employeeName?: string
      employeePhoto?: string | null
      permissions?: string[]
    }
  }
}