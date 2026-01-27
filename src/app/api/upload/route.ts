// ============================================
// src/app/api/upload/route.ts
// Version: 20260127
// RBAC v2: Use permission system from DOC-013/DOC-014
// ============================================

import { NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { requirePermission } from '@/lib/permissions'

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME || 'wdi-erp-files'

export async function POST(request: Request) {
  try {
    const session = await auth()

    // RBAC v2: Check create permission for files (any user who can create content can upload files)
    const denied = await requirePermission(session, 'files', 'create')
    if (denied) return denied

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // בדיקת גודל קובץ (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'קובץ גדול מדי. מקסימום 10MB' },
        { status: 400 }
      )
    }

    // בדיקת סוג קובץ
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'סוג קובץ לא נתמך. מותר: תמונות ו-PDF' },
        { status: 400 }
      )
    }

    // יצירת שם קובץ ייחודי
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`

    // העלאה ל-GCS
    const bucket = storage.bucket(bucketName)
    const blob = bucket.file(fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    })

    // יצירת URL ציבורי
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`

    // Logging - added
    await logActivity({
      action: 'UPLOAD',
      category: 'files',
      module: 'files',
      targetType: 'file',
      targetId: fileName,
      targetName: file.name,
      details: {
        folder,
        originalName: file.name,
        type: file.type,
        size: file.size,
        path: fileName,
      }
    })

    return NextResponse.json({
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      path: fileName,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
