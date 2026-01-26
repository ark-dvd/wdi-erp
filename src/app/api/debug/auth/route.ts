// ================================================
// DIAGNOSTIC ENDPOINT - REMOVE AFTER DEBUGGING
// Shows raw session and database state
// ================================================

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadUserAuthContext } from '@/lib/authorization'

export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'No session', session: null })
    }

    const userId = (session.user as any)?.id
    const userEmail = session.user?.email

    // Get raw database state
    let dbState = null
    if (userEmail) {
      const dbUser = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  level: true,
                },
              },
            },
          },
        },
      })

      dbState = {
        userId: dbUser?.id,
        email: dbUser?.email,
        rolesCount: dbUser?.roles?.length || 0,
        roles: dbUser?.roles?.map(ur => ({
          roleId: ur.roleId,
          roleName: ur.role.name,
          roleDisplayName: ur.role.displayName,
          roleLevel: ur.role.level,
        })) || [],
      }
    }

    // Get authorization context
    let authContext = null
    if (userId) {
      authContext = await loadUserAuthContext(userId)
    }

    // Return diagnostic info
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      session: {
        raw: {
          userId: (session.user as any)?.id,
          email: session.user?.email,
          role: (session.user as any)?.role,
          roleDisplayName: (session.user as any)?.roleDisplayName,
          roles: (session.user as any)?.roles,
          rolesType: typeof (session.user as any)?.roles,
          rolesIsArray: Array.isArray((session.user as any)?.roles),
          permissions: (session.user as any)?.permissions,
          permissionsCount: (session.user as any)?.permissions?.length || 0,
        },
      },
      database: dbState,
      authContext: authContext ? {
        userId: authContext.userId,
        employeeId: authContext.employeeId,
        rolesCount: authContext.roles.length,
        roles: authContext.roles,
        permissionsCount: authContext.permissions.length,
        samplePermissions: authContext.permissions.slice(0, 10),
        assignedDomainIds: authContext.assignedDomainIds,
        assignedProjectIds: authContext.assignedProjectIds,
      } : null,
      checks: {
        hasSession: !!session,
        hasUserId: !!userId,
        hasRolesArray: Array.isArray((session.user as any)?.roles),
        rolesArrayLength: (session.user as any)?.roles?.length || 0,
        roleString: (session.user as any)?.role,
        isOwner: (session.user as any)?.role === 'owner',
        rolesIncludeOwner: ((session.user as any)?.roles || []).some((r: any) => r?.name === 'owner'),
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: String(error),
    }, { status: 500 })
  }
}
