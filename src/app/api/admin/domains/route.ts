// ================================================
// WDI ERP - Admin Domains API
// Version: 20260202-RBAC-V2-PHASE3
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    // RBAC v2 / DOC-016 §6.1: Operation-specific permission check
    const denied = await requirePermission(session, 'admin', 'read')
    if (denied) return denied

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
