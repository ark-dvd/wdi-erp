// src/app/api/admin/domains/route.ts
// Version: 20260128-RBAC-V2
// Admin API to list business domains

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// RBAC admin roles that can access this endpoint
const RBAC_ADMIN_ROLES = ['owner', 'trust_officer']

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const userRoles = (session.user as any)?.roles || []
    const userRoleNames: string[] = userRoles.map((r: { name: string }) => r?.name).filter(Boolean)
    const primaryRole = (session.user as any)?.role

    const canAccess =
      userRoleNames.some((r: string) => RBAC_ADMIN_ROLES.includes(r)) ||
      (primaryRole ? RBAC_ADMIN_ROLES.includes(primaryRole) : false)

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
      },
    })

    return NextResponse.json(domains)
  } catch (error) {
    console.error('Error fetching domains:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
