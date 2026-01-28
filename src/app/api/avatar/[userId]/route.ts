// src/app/api/avatar/[userId]/route.ts
// Version: 20260128-RBAC-V2
// Purpose: Serve user avatar images without requiring session cookies
// Note: This endpoint is intentionally unauthenticated because Next.js Image
// component cannot pass session cookies. Security is via userId lookup validation.

import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { prisma } from '@/lib/prisma'

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME || 'wdi-erp-files'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Lookup user and get their employee photo URL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        employee: {
          select: { photoUrl: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const photoUrl = user.employee?.photoUrl

    if (!photoUrl) {
      // Return a 204 No Content to indicate no avatar available
      return new NextResponse(null, { status: 204 })
    }

    // Extract file path from GCS URL
    let filePath = photoUrl
    if (photoUrl.includes('storage.googleapis.com')) {
      const match = photoUrl.match(/storage\.googleapis\.com\/[^/]+\/(.+)/)
      if (match) filePath = decodeURIComponent(match[1])
    }

    const file = storage.bucket(bucketName).file(filePath)
    const [exists] = await file.exists()

    if (!exists) {
      return new NextResponse(null, { status: 204 })
    }

    const [metadata] = await file.getMetadata()
    const [buffer] = await file.download()

    const headers: Record<string, string> = {
      'Content-Type': metadata.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    }

    return new NextResponse(new Uint8Array(buffer), { headers })
  } catch (error) {
    console.error('Error fetching avatar:', error)
    return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 500 })
  }
}
