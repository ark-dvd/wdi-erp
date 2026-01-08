import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Storage } from '@google-cloud/storage'

const API_KEY = process.env.EMAIL_ADDON_API_KEY || 'wdi-email-addon-secret-2024'
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

    // Find user by email
    const user = userEmail ? await prisma.user.findUnique({
      where: { email: userEmail }
    }) : null

    // Build description with user note + full email
    let description = ''
    
    if (userNote && userNote.trim()) {
      description += `${userNote.trim()}\n\n--- מייל מקורי ---\n`
    }
    
    description += `נושא: ${emailSubject}
מאת: ${emailFrom}
אל: ${emailTo || '-'}
תאריך: ${emailDate || new Date().toISOString()}

${emailBody}`

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
    if (attachments && attachments.length > 0) {
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

    return NextResponse.json({ 
      success: true, 
      eventId: event.id,
      message: 'Email saved as event',
      attachmentsCount: attachments?.length || 0
    })

  } catch (error) {
    console.error('Error creating email event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}