// src/app/api/domains/route.ts
// Version: 20260129-RBAC-DOMAINS
// Public domain listing endpoint with RBAC scope information
// Implements: DOC-006 Authorization Model, DOC-013 RBAC Authorization Matrix

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { loadUserAuthContext } from '@/lib/authorization'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // Load user's full authorization context using RBAC system
    const authContext = await loadUserAuthContext(session.user.id)
    if (!authContext) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 403 })
    }

    // Helper to determine effective scope for a given action
    // Per DOC-013 §5.2: Broadest scope wins when user has multiple permissions
    const getEffectiveScope = (action: string): 'ALL' | 'DOMAIN' | 'NONE' => {
      const permissions = authContext.permissions.filter(
        (p) => p.module === 'projects' && p.action === action
      )

      let hasAll = false
      let hasDomain = false
      for (const perm of permissions) {
        if (perm.scope === 'ALL') {
          hasAll = true
          break // ALL is broadest, no need to check further
        } else if (perm.scope === 'DOMAIN') {
          hasDomain = true
        }
      }

      if (hasAll) return 'ALL'
      if (hasDomain) return 'DOMAIN'
      return 'NONE'
    }

    // Get scope for both CREATE and UPDATE operations
    const createScope = getEffectiveScope('CREATE')
    const updateScope = getEffectiveScope('UPDATE')

    // Fetch all active domains
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

    return NextResponse.json({
      domains,
      userScope: createScope, // Backwards compatible - used by new project page
      createScope,
      updateScope,
      userAssignedDomainIds: authContext.assignedDomainIds,
    })
  } catch (error) {
    console.error('Error fetching domains:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
