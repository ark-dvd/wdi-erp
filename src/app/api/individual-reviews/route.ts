// src/app/api/individual-reviews/route.ts
// Version: 20260111-140600
// FIXED: Wrap POST in transaction for atomicity
// Added: logCrud for CREATE

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const projectId = searchParams.get('projectId');
    const organizationId = searchParams.get('organizationId');

    const where: Record<string, unknown> = {};
    if (contactId) where.contactId = contactId;
    if (projectId) where.projectId = projectId;

    if (organizationId) {
      const orgContacts = await prisma.contact.findMany({
        where: { organizationId },
        select: { id: true },
      });
      where.contactId = { in: orgContacts.map(c => c.id) };
    }

    const reviews = await prisma.individualReview.findMany({
      where,
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
        project: { select: { id: true, name: true, projectNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching individual reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { contactId, projectId, ...ratingData } = body;

    if (!contactId || !projectId) {
      return NextResponse.json({ error: 'contactId and projectId are required' }, { status: 400 });
    }

    const existingReview = await prisma.individualReview.findUnique({
      where: {
        reviewerId_contactId_projectId: {
          reviewerId: user.id,
          contactId,
          projectId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json({
        error: 'כבר דירגת את איש הקשר הזה בפרויקט זה'
      }, { status: 409 });
    }

    const ratings: Record<string, number> = {};
    const notes: Record<string, string | null> = {};
    
    for (const field of CRITERIA_FIELDS) {
      ratings[field] = ratingData[field] || 0;
      notes[`${field}Note`] = ratingData[`${field}Note`] || null;
    }

    const avgRating = calcAvgRating(Object.values(ratings));

    const ratedCount = Object.values(ratings).filter(r => r > 0).length;
    if (ratedCount < 6) {
      return NextResponse.json({ 
        error: `יש לדרג לפחות 6 קריטריונים (דורגו ${ratedCount})` 
      }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { organizationId: true, firstName: true, lastName: true },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const review = await prisma.$transaction(async (tx) => {
      const review = await tx.individualReview.create({
        data: {
          reviewerId: user.id,
          contactId,
          projectId,
          accountability: ratings.accountability,
          accountabilityNote: notes.accountabilityNote,
          boqQuality: ratings.boqQuality,
          boqQualityNote: notes.boqQualityNote,
          specQuality: ratings.specQuality,
          specQualityNote: notes.specQualityNote,
          planQuality: ratings.planQuality,
          planQualityNote: notes.planQualityNote,
          valueEngineering: ratings.valueEngineering,
          valueEngineeringNote: notes.valueEngineeringNote,
          availability: ratings.availability,
          availabilityNote: notes.availabilityNote,
          interpersonal: ratings.interpersonal,
          interpersonalNote: notes.interpersonalNote,
          creativity: ratings.creativity,
          creativityNote: notes.creativityNote,
          expertise: ratings.expertise,
          expertiseNote: notes.expertiseNote,
          timelinessAdherence: ratings.timelinessAdherence,
          timelinessAdherenceNote: notes.timelinessAdherenceNote,
          proactivity: ratings.proactivity,
          proactivityNote: notes.proactivityNote,
          communication: ratings.communication,
          communicationNote: notes.communicationNote,
          generalNotes: ratingData.generalNotes || null,
          avgRating,
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              organizationId: true,
            }
          },
          project: { select: { id: true, name: true, projectNumber: true } },
        },
      })

      await updateContactAvgRating(contactId, tx)

      if (contact?.organizationId) {
        await updateOrganizationAvgRating(contact.organizationId, tx)
      }

      await logCrud('CREATE', 'vendor-rating', 'individual-review', review.id,
        `דירוג ${contact?.firstName} ${contact?.lastName} - ${project?.name}`, {
        contactId,
        contactName: `${contact?.firstName} ${contact?.lastName}`,
        projectId,
        projectName: project?.name,
        avgRating: avgRating.toFixed(2),
      })

      return review
    })

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating individual review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateContactAvgRating(contactId: string, tx: TxClient) {
  const reviews = await tx.individualReview.findMany({
    where: { contactId },
    select: { avgRating: true },
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.avgRating, 0) / reviews.length
    : null;

  await tx.contact.update({
    where: { id: contactId },
    data: {
      averageRating: avgRating,
      reviewCount: reviews.length,
    },
  });
}

async function updateOrganizationAvgRating(organizationId: string, tx: TxClient) {
  const contacts = await tx.contact.findMany({
    where: {
      organizationId,
      reviewCount: { gt: 0 },
    },
    select: { averageRating: true, reviewCount: true },
  });

  if (contacts.length === 0) {
    await tx.organization.update({
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

  await tx.organization.update({
    where: { id: organizationId },
    data: {
      averageRating: avgRating,
      reviewCount: totalWeight,
    },
  });
}
