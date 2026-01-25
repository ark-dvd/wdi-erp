// ============================================
// src/app/api/events/from-email/route.ts
// Version: 20260124
// IDEMPOTENCY: Added replay detection via fingerprint
// OBSERVABILITY: Added logCrud for event creation audit trail
// ============================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Storage } from '@google-cloud/storage'
import { createHash } from 'crypto'
import { logCrud } from '@/lib/activity'

const API_KEY = process.env.EMAIL_ADDON_API_KEY || 'wdi-email-addon-secret-2024'

// Generate deterministic fingerprint for email deduplication
function generateEmailFingerprint(projectId: string, emailFrom: string, emailSubject: string, emailDate: string): string {
  const data = `${projectId}|${emailFrom}|${emailSubject}|${emailDate}`
  return createHash('sha256').update(data).digest('hex').substring(0, 32)
}
const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME || 'wdi-erp-files'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const apiKeyHeader = request.headers.get('X-API-Key')
    if (!(authHeader === `Bearer ${API_KEY}` || apiKeyHeader === API_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      projectId, 
      eventType,
      userNote,
      emailSubject, 
      emailFrom, 
      emailTo, 
      emailDate, 
      emailBody, 
      userEmail,
      attachments  // מערך של { filename, mimeType, base64Data }
    } = body

    // Validate required fields
    if (!projectId || !eventType || !emailSubject || !emailFrom || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate fingerprint for deduplication
    const fingerprint = generateEmailFingerprint(
      projectId,
      emailFrom,
      emailSubject,
      emailDate || new Date().toISOString()
    )
    const fingerprintMarker = `[email-fp:${fingerprint}]`

    // Check for duplicate (replay detection)
    const existingEvent = await prisma.projectEvent.findFirst({
      where: {
        projectId,
        description: { contains: fingerprintMarker }
      },
      select: { id: true }
    })

    if (existingEvent) {
      // Replay detected - return existing event info
      return NextResponse.json({
        success: true,
        eventId: existingEvent.id,
        message: 'Email already saved (duplicate detected)',
        duplicate: true
      })
    }

    // Find user by email
    const user = userEmail ? await prisma.user.findUnique({
      where: { email: userEmail }
    }) : null

    // Build description with user note + full email + fingerprint marker
    let description = ''

    if (userNote && userNote.trim()) {
      description += `${userNote.trim()}\n\n--- מייל מקורי ---\n`
    }

    description += `נושא: ${emailSubject}
מאת: ${emailFrom}
אל: ${emailTo || '-'}
תאריך: ${emailDate || new Date().toISOString()}

${emailBody}

${fingerprintMarker}`

    // Create event
    const event = await prisma.projectEvent.create({
      data: {
        projectId,
        eventType,
        description,
        eventDate: emailDate ? new Date(emailDate) : new Date(),
        createdById: user?.id || null,
      }
    })

    // Upload attachments to GCS and create EventFile records
    const attachmentsCount = attachments?.length || 0
    if (attachments && attachmentsCount > 0) {
      const bucket = storage.bucket(bucketName)

      for (const attachment of attachments) {
        const { filename, mimeType, base64Data } = attachment

        // Generate unique filename
        const timestamp = Date.now()
        const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
        const gcsPath = `events/${event.id}/${timestamp}_${safeName}`

        // Upload to GCS
        const file = bucket.file(gcsPath)
        const buffer = Buffer.from(base64Data, 'base64')

        await file.save(buffer, {
          metadata: {
            contentType: mimeType,
          }
        })

        // Create EventFile record
        await prisma.eventFile.create({
          data: {
            eventId: event.id,
            fileName: filename,
            fileUrl: gcsPath,
            fileType: mimeType,
            fileSize: buffer.length,
          }
        })
      }
    }

    // Audit logging - outside mutations (non-critical)
    try {
      await logCrud('CREATE', 'events', 'from-email', event.id,
        `אירוע נוצר ממייל: ${emailSubject}`, {
        eventId: event.id,
        projectId,
        projectName: project.name,
        eventType,
        emailFrom,
        emailSubject,
        attachmentsCount,
        fingerprint,
        userEmail: userEmail || null,
        duplicate: false,
      })
    } catch (logError) {
      console.error('Failed to create audit log:', logError)
    }

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: 'Email saved as event',
      attachmentsCount
    })

  } catch (error) {
    console.error('Error creating email event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}