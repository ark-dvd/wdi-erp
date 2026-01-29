// src/app/api/individual-reviews/route.ts
// Version: 20260128-RBAC-V2
// RBAC v2: Use permission system from DOC-013/DOC-014
// FIXED: Wrap POST in transaction for atomicity
// Added: logCrud for CREATE
// MAYBACH: R1-Pagination, R2-FieldValidation, R3-FilterStrictness, R4-Sorting, R5-Versioning

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logCrud } from '@/lib/activity';
import { requirePermission } from '@/lib/permissions';
import {
  parsePagination,
  calculateSkip,
  paginatedResponse,
  parseAndValidateFilters,
  filterValidationError,
  parseAndValidateSort,
  sortValidationError,
  toPrismaOrderBy,
  versionedResponse,
  validationError,
  FILTER_DEFINITIONS,
  SORT_DEFINITIONS,
} from '@/lib/api-contracts';

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
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 });
    }

    // RBAC v2: Check read permission for vendors (vendor ratings)
    const denied = await requirePermission(session, 'vendors', 'read');
    if (denied) return denied;

    const { searchParams } = new URL(request.url);

    // R1: Parse pagination
    const { page, limit } = parsePagination(searchParams);

    // R3: Validate filters (no silent ignore)
    const filterResult = parseAndValidateFilters(searchParams, FILTER_DEFINITIONS.reviews);
    if (!filterResult.valid) {
      return filterValidationError(filterResult.errors);
    }
    const { contactId, projectId, organizationId } = filterResult.filters;

    // R4: Validate sort parameters
    const sortResult = parseAndValidateSort(searchParams, SORT_DEFINITIONS.reviews);
    if (!sortResult.valid && sortResult.error) {
      return sortValidationError(sortResult.error);
    }

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

    // R1: Count total for pagination
    const total = await prisma.individualReview.count({ where });

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
      // R4: Client-configurable sorting
      orderBy: toPrismaOrderBy(sortResult.sort),
      // R1: Apply pagination
      skip: calculateSkip(page, limit),
      take: limit,
    });

    // R1 + R5: Return paginated response with versioning
    return versionedResponse(paginatedResponse(reviews, page, limit, total));
  } catch (error) {
    console.error('Error fetching individual reviews:', error);
    return versionedResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return versionedResponse({ error: 'אין לך הרשאה' }, { status: 401 });
    }

    // RBAC v2: Check create permission for vendors (vendor ratings)
    const denied = await requirePermission(session, 'vendors', 'create');
    if (denied) return denied;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return versionedResponse({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { contactId, projectId, externalProjectName, ...ratingData } = body;

    // R2: Field-level validation
    const fieldErrors: Record<string, string> = {};
    if (!contactId) fieldErrors.contactId = 'נדרש לבחור איש קשר';
    // Either projectId OR externalProjectName is required
    if (!projectId && !externalProjectName) {
      fieldErrors.projectId = 'נדרש לבחור פרויקט או להזין שם פרויקט חיצוני';
    }
    if (Object.keys(fieldErrors).length > 0) {
      return validationError(fieldErrors);
    }

    // Check for existing review
    if (projectId) {
      // Internal project - check unique constraint
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
        return versionedResponse({
          error: 'כבר דירגת את איש הקשר הזה בפרויקט זה'
        }, { status: 409 });
      }
    } else {
      // External project - check by externalProjectName
      const existingExternalReview = await prisma.individualReview.findFirst({
        where: {
          reviewerId: user.id,
          contactId,
          projectId: null,
          externalProjectName: externalProjectName,
        },
      });

      if (existingExternalReview) {
        return versionedResponse({
          error: 'כבר דירגת את איש הקשר הזה בפרויקט חיצוני זה'
        }, { status: 409 });
      }
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
      return validationError({
        ratings: `יש לדרג לפחות 6 קריטריונים (דורגו ${ratedCount})`
      });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { organizationId: true, firstName: true, lastName: true },
    });

    // Only fetch project if projectId is provided (not external)
    const project = projectId ? await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    }) : null;

    const review = await prisma.$transaction(async (tx) => {
      const review = await tx.individualReview.create({
        data: {
          reviewerId: user.id,
          contactId,
          projectId: projectId || null,
          externalProjectName: externalProjectName || null,
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

      const projectDisplayName = projectId ? project?.name : `${externalProjectName} (חיצוני)`;
      await logCrud('CREATE', 'vendor-rating', 'individual-review', review.id,
        `דירוג ${contact?.firstName} ${contact?.lastName} - ${projectDisplayName}`, {
        contactId,
        contactName: `${contact?.firstName} ${contact?.lastName}`,
        projectId: projectId || null,
        externalProjectName: externalProjectName || null,
        projectName: projectDisplayName,
        avgRating: avgRating.toFixed(2),
      })

      return review
    })

    // R5: Versioned response with 201 status
    return versionedResponse(review, { status: 201 });
  } catch (error) {
    console.error('Error creating individual review:', error);
    return versionedResponse({ error: 'Internal server error' }, { status: 500 });
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
