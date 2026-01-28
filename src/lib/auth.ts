// ================================================
// WDI ERP - NextAuth Configuration
// Version: 20260125-RBAC-V1
// RBAC v1: Multi-role support per DOC-013
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

      // RBAC v1 (DOC-013 R-001): Ensure all_employees role is assigned
      const allEmployeesRole = await prisma.role.findUnique({
        where: { name: 'all_employees' },
      })

      if (allEmployeesRole) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: existingUser.id,
              roleId: allEmployeesRole.id,
            },
          },
          update: {},
          create: {
            userId: existingUser.id,
            roleId: allEmployeesRole.id,
          },
        })
      }

      await logLogin(user.email, true)
      return true
    },

    async session({ session, token }) {
      if (session.user?.email) {
        // RBAC v1: Load multi-role data from UserRole junction table
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
              orderBy: { role: { level: 'asc' } }, // Primary role first
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

          // RBAC v1: Load all roles
          session.user.roles = dbUser.roles.map((ur) => ({
            name: ur.role.name as CanonicalRole,
            displayName: ur.role.displayName,
          }))

          // Primary role (highest privilege for display)
          const primaryRole = dbUser.roles[0]?.role
          session.user.role = primaryRole?.name || 'all_employees'
          session.user.roleDisplayName = primaryRole?.displayName || 'כל העובדים'

          session.user.employeeId = dbUser.employeeId

          // RBAC v1: Load permissions with scope (union-of-allows)
          const permissionSet = new Set<string>()
          for (const userRole of dbUser.roles) {
            for (const rp of userRole.role.permissions) {
              // Format: "module:action:scope"
              permissionSet.add(
                `${rp.permission.module}:${rp.permission.action}:${rp.permission.scope}`
              )
            }
          }
          session.user.permissions = Array.from(permissionSet)

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
// Type Declarations (RBAC v1)
// ================================================

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      // RBAC v1: Multi-role support
      roles?: { name: CanonicalRole; displayName: string }[]
      role?: string // Primary role (backwards compat)
      roleDisplayName?: string
      employeeId?: string | null
      employeeName?: string
      employeePhoto?: string | null
      // RBAC v1: Permissions with scope
      permissions?: string[] // "module:action:scope" format
      // RBAC v1: Domain assignments
      assignedDomainIds?: string[]
    }
  }
}
