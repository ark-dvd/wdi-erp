// src/app/api/individual-reviews/external-projects/route.ts
// Version: 20260128
// Returns distinct externalProjectName values for autocomplete

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 });
    }

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
