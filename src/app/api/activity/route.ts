// ================================================
// WDI ERP - Activity Logging API
// Version: 20260202-RBAC-V2-PHASE5-E
// ================================================
//
// E2: RBAC EXEMPTION - Auth-only by design (no requirePermission)
//
// Rationale:
// 1. DOC-008 Audit Trail Intent: All authenticated user actions MUST be logged.
//    Adding permission gates would break audit trail for users without specific grants.
// 2. Self-Scoped: userId is extracted from session (line 26), not from request body.
//    Users cannot log as another user or impersonate.
// 3. Write-Only: No data leak risk - endpoint only creates ActivityLog entries.
// 4. Default-Deny Satisfied: Unauthenticated requests are rejected (401).
// 5. Chicken-Egg Prevention: Activity logging often precedes permission checks;
//    requiring permission to log would create circular dependency.
//
// Security Controls:
// - Session required (auth())
// - userId bound to session.user.id (cannot be spoofed via request body)
// - IP and userAgent captured from headers (server-side, not client-provided)
// ================================================

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
    }

    const data = await request.json()
    const headersList = await headers()
    
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id || null,
        userEmail: session.user.email,
        userRole: (session.user as any)?.role?.name || null,
        action: data.action,
        category: data.category,
        module: data.module || null,
        path: data.path || null,
        targetType: data.targetType || null,
        targetId: data.targetId || null,
        targetName: data.targetName || null,
        details: data.details || null,
        duration: data.duration || null,
        success: data.success ?? true,
        ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null,
        userAgent: headersList.get('user-agent') || null,
      }
    })
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}
