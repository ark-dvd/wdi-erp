// ================================================
// WDI ERP - NextAuth Configuration
// Version: 20260202-RBAC-V2
// RBAC v2 / INV-007: Single role enforcement per DOC-016 v2.0
// ================================================

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { prisma } from "./prisma"
import type { CanonicalRole } from "./authorization"

// Internal login logging function
async function logLogin(email: string, success: boolean, reason?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        roles: {
          include: { role: { select: { name: true } } },
          orderBy: { role: { level: 'asc' } },
          take: 1,
        },
      },
    })
    await prisma.activityLog.create({
      data: {
        userId: user?.id || null,
        userEmail: email,
        userRole: user?.roles?.[0]?.role?.name || null,
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAIL',
        category: 'auth',
        module: 'auth',
        success,
        details: reason ? { reason } : undefined,
      },
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

      // Update last login and profile info
      await prisma.user.update({
        where: { email: user.email },
        data: {
          lastLogin: new Date(),
          name: user.name,
          image: user.image,
        },
      })

      // RBAC v2 / INV-007: Assign all_employees ONLY if user has NO role
      // Single role enforcement - do NOT add a second role
      const existingUserRole = await prisma.userRole.findUnique({
        where: { userId: existingUser.id },
      })

      if (!existingUserRole) {
        const allEmployeesRole = await prisma.role.findUnique({
          where: { name: 'all_employees' },
        })

        if (allEmployeesRole) {
          await prisma.userRole.create({
            data: {
              userId: existingUser.id,
              roleId: allEmployeesRole.id,
            },
          })
        }
      }

      await logLogin(user.email, true)
      return true
    },

    async session({ session, token }) {
      if (session.user?.email) {
        // RBAC v2 / INV-007: Load SINGLE role from UserRole table
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
            employee: true,
            domainAssignments: {
              where: { domain: { isActive: true } },
              select: { domainId: true },
            },
          },
        })

        if (dbUser) {
          session.user.id = dbUser.id

          // INV-007: CRITICAL - Enforce single role invariant
          // If somehow >1 role exists (should be impossible with DB constraint), FAIL CLOSED
          if (dbUser.roles.length > 1) {
            console.error(
              `[AUTH] CRITICAL: MULTI_ROLE_STATE detected for user ${dbUser.id}. ` +
              `Found ${dbUser.roles.length} roles. INV-007 violation.`
            )
            // Log to activity for audit trail
            await prisma.activityLog.create({
              data: {
                userId: dbUser.id,
                userEmail: dbUser.email,
                userRole: 'MULTI_ROLE_STATE',
                action: 'SESSION_DENIED',
                category: 'SECURITY',
                module: 'auth',
                success: false,
                details: {
                  reason: 'MULTI_ROLE_STATE',
                  roleCount: dbUser.roles.length,
                  roleNames: dbUser.roles.map((ur) => ur.role.name),
                  invariant: 'INV-007',
                },
              },
            })
            // FAIL CLOSED: Return minimal session with no permissions
            session.user.role = undefined
            session.user.roles = []
            session.user.permissions = []
            return session
          }

          // RBAC v2: Single role (or none)
          const userRole = dbUser.roles[0]
          if (userRole) {
            // Single role - for backwards compat, also populate roles array with one element
            session.user.roles = [{
              name: userRole.role.name as CanonicalRole,
              displayName: userRole.role.displayName,
            }]
            session.user.role = userRole.role.name
            session.user.roleDisplayName = userRole.role.displayName
          } else {
            // No role assigned - INV-008: fail closed
            session.user.role = undefined
            session.user.roles = []
          }

          session.user.employeeId = dbUser.employeeId

          // RBAC v2: Permissions from SINGLE role only (no union across roles)
          if (userRole) {
            session.user.permissions = userRole.role.permissions.map(
              (rp) => `${rp.permission.module}:${rp.permission.action}:${rp.permission.scope}`
            )
          } else {
            session.user.permissions = []
          }

          // Load assigned domain IDs for scope evaluation
          session.user.assignedDomainIds = dbUser.domainAssignments.map((d) => d.domainId)

          // Employee info
          if (dbUser.employee) {
            session.user.employeeName = `${dbUser.employee.firstName} ${dbUser.employee.lastName}`
            if (dbUser.employee.photoUrl) {
              // Use dedicated avatar endpoint (doesn't require session cookies for Image component)
              session.user.employeePhoto = `/api/avatar/${dbUser.id}`
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

// ================================================
// Type Declarations (RBAC v2 / INV-007)
// ================================================

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      // RBAC v2 / INV-007: Single role (array kept for backwards compat, always 0 or 1 element)
      roles?: { name: CanonicalRole; displayName: string }[]
      role?: string // The user's single role
      roleDisplayName?: string
      employeeId?: string | null
      employeeName?: string
      employeePhoto?: string | null
      // RBAC v2: Permissions from single role (no union)
      permissions?: string[] // "module:action:scope" format
      // Domain assignments for scope evaluation
      assignedDomainIds?: string[]
    }
  }
}
