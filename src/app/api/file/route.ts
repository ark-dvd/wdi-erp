// src/app/api/file/route.ts
// Version: 20260128-RBAC-V2
// RBAC v2: Added authentication check (file proxy requires auth)

import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { auth } from '@/lib/auth'

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME || 'wdi-erp-files'

export async function GET(request: NextRequest) {
  // Authentication check - file proxy requires authenticated user
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = request.nextUrl.searchParams.get('url')
  const download = request.nextUrl.searchParams.get('download')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    // Extract file path from GCS URL
    // Format: https://storage.googleapis.com/bucket-name/path/to/file
    let filePath = url
    if (url.includes('storage.googleapis.com')) {
      const match = url.match(/storage\.googleapis\.com\/[^/]+\/(.+)/)
      if (match) filePath = decodeURIComponent(match[1])
    }

    const file = storage.bucket(bucketName).file(filePath)
    const [exists] = await file.exists()
    
    if (!exists) {
      return NextResponse.json({ error: 'File not found', path: filePath }, { status: 404 })
    }

    const [metadata] = await file.getMetadata()
    const [buffer] = await file.download()

    const headers: Record<string, string> = {
      'Content-Type': metadata.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    }

    if (download === 'true') {
      const fileName = filePath.split('/').pop() || 'file'
      headers['Content-Disposition'] = `attachment; filename="${fileName}"`
    }

    return new NextResponse(new Uint8Array(buffer), { headers })
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}
