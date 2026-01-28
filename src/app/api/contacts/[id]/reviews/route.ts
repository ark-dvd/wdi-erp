// src/app/api/contacts/[id]/reviews/route.ts
// Version: 20260128-RBAC-V2
// RBAC v2: Use permission system from DOC-013/DOC-014

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC v2: Check read permission for vendors (vendor ratings)
    const denied = await requirePermission(session, 'vendors', 'read');
    if (denied) return denied;

    const reviews = await prisma.individualReview.findMany({
      where: { contactId: params.id },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            employee: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        project: {
          select: { id: true, projectNumber: true, name: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching contact reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
