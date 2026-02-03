// src/app/api/individual-reviews/external-projects/route.ts
// Version: 20260202-RBAC-V2-PHASE5-E
// RBAC v2: Uses requirePermission (DOC-016 §6.1, FP-002)
// E3: Added vendors:read permission gate (IndividualReview = vendor reviews)
// Returns distinct externalProjectName values for autocomplete

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 });
    }

    // E3: RBAC v2 / DOC-016 §6.1: Permission gate for reading vendor review data
    const denied = await requirePermission(session, 'vendors', 'read');
    if (denied) return denied;

    // Get distinct non-null externalProjectName values
    const results = await prisma.individualReview.findMany({
      where: {
        externalProjectName: { not: null },
      },
      select: {
        externalProjectName: true,
      },
      distinct: ['externalProjectName'],
      orderBy: {
        externalProjectName: 'asc',
      },
    });

    // Extract unique names
    const externalProjects = results
      .map(r => r.externalProjectName)
      .filter((name): name is string => name !== null);

    return NextResponse.json(externalProjects);
  } catch (error) {
    console.error('Error fetching external projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
