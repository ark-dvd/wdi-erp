// src/app/api/contacts/[id]/reviews/route.ts
// Version: 20251221-073100

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
