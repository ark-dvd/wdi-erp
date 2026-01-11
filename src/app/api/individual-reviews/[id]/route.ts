// /app/api/individual-reviews/[id]/route.ts
// Version: 20260111-140700
// Added: logCrud for UPDATE, DELETE

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logCrud } from '@/lib/activity';

const CRITERIA_FIELDS = [
  'accountability', 'boqQuality', 'specQuality', 'planQuality',
  'valueEngineering', 'availability', 'interpersonal', 'creativity',
  'expertise', 'timelinessAdherence', 'proactivity', 'communication',
] as const;

function calcAvgRating(ratings: number[]): number {
  const valid = ratings.filter(r => r > 0);
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await prisma.individualReview.findUnique({
      where: { id: params.id },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
        contact: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true,
            organizationId: true,
            organization: { select: { id: true, name: true } },
          } 
        },
        project: { select: { id: true, projectNumber: true, name: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error fetching individual review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await prisma.individualReview.findUnique({
      where: { id: params.id },
      include: {
        contact: { select: { organizationId: true, firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.reviewerId !== session.user.id) {
      return NextResponse.json({ error: 'אין הרשאה לערוך דירוג זה' }, { status: 403 });
    }

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation > 14) {
      return NextResponse.json({ error: 'לא ניתן לערוך דירוג לאחר 14 יום' }, { status: 403 });
    }

    const data = await request.json();

    const ratings: Record<string, number> = {};
    const notes: Record<string, string | null> = {};
    
    for (const field of CRITERIA_FIELDS) {
      ratings[field] = data[field] || 0;
      notes[`${field}Note`] = data[`${field}Note`] || null;
    }

    const ratedCount = Object.values(ratings).filter(r => r > 0).length;
    if (ratedCount < 6) {
      return NextResponse.json({ 
        error: `יש לדרג לפחות 6 קריטריונים (דורגו ${ratedCount})` 
      }, { status: 400 });
    }

    const avgRating = calcAvgRating(Object.values(ratings));

    const updatedReview = await prisma.individualReview.update({
      where: { id: params.id },
      data: {
        ...ratings,
        ...notes,
        generalNotes: data.generalNotes || null,
        avgRating,
      },
    });

    await updateContactAvgRating(review.contactId);

    if (review.contact.organizationId) {
      await updateOrganizationAvgRating(review.contact.organizationId);
    }

    // Logging - added
    await logCrud('UPDATE', 'vendor-rating', 'individual-review', params.id,
      `דירוג ${review.contact.firstName} ${review.contact.lastName} - ${review.project?.name}`, {
      contactName: `${review.contact.firstName} ${review.contact.lastName}`,
      projectName: review.project?.name,
      avgRating: avgRating.toFixed(2),
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error('Error updating individual review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await prisma.individualReview.findUnique({
      where: { id: params.id },
      include: {
        contact: { select: { organizationId: true, firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.reviewerId !== session.user.id) {
      return NextResponse.json({ error: 'אין הרשאה למחוק דירוג זה' }, { status: 403 });
    }

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation > 14) {
      return NextResponse.json({ error: 'לא ניתן למחוק דירוג לאחר 14 יום' }, { status: 403 });
    }

    const contactId = review.contactId;
    const organizationId = review.contact.organizationId;
    const contactName = `${review.contact.firstName} ${review.contact.lastName}`;
    const projectName = review.project?.name;

    await prisma.individualReview.delete({
      where: { id: params.id },
    });

    await updateContactAvgRating(contactId);

    if (organizationId) {
      await updateOrganizationAvgRating(organizationId);
    }

    // Logging - added
    await logCrud('DELETE', 'vendor-rating', 'individual-review', params.id,
      `דירוג ${contactName} - ${projectName}`, {
      contactName,
      projectName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting individual review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateContactAvgRating(contactId: string) {
  const reviews = await prisma.individualReview.findMany({
    where: { contactId },
    select: { avgRating: true },
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.avgRating, 0) / reviews.length
    : null;

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      averageRating: avgRating,
      reviewCount: reviews.length,
    },
  });
}

async function updateOrganizationAvgRating(organizationId: string) {
  const contacts = await prisma.contact.findMany({
    where: { 
      organizationId,
      reviewCount: { gt: 0 },
    },
    select: { averageRating: true, reviewCount: true },
  });

  if (contacts.length === 0) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { averageRating: null, reviewCount: 0 },
    });
    return;
  }

  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const contact of contacts) {
    if (contact.averageRating !== null) {
      weightedSum += contact.averageRating * contact.reviewCount;
      totalWeight += contact.reviewCount;
    }
  }

  const avgRating = totalWeight > 0 ? weightedSum / totalWeight : null;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      averageRating: avgRating,
      reviewCount: totalWeight,
    },
  });
}
