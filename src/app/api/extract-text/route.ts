// ============================================
// src/app/api/extract-text/route.ts
// Version: 20260112-004500
// Note: POST has no auth - called internally by events API
// OBSERVABILITY: Added logCrud for text extraction audit trail
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractTextFromFile, supportsTextExtraction } from '@/lib/text-extraction';
import { auth } from '@/lib/auth';
import { logCrud } from '@/lib/activity';

export async function POST(request: NextRequest) {
  // No auth check - this is called internally by the events API after file upload
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const file = await prisma.eventFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        extractedText: true,
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (!supportsTextExtraction(file.fileType, file.fileUrl)) {
      return NextResponse.json({ 
        error: 'Text extraction not supported for this file type',
        fileType: file.fileType 
      }, { status: 400 });
    }

    if (file.extractedText) {
      return NextResponse.json({
        success: true,
        alreadyExtracted: true,
        textLength: file.extractedText.length,
      });
    }

    const extractedText = await extractTextFromFile(file.fileUrl, file.fileType);

    if (extractedText) {
      await prisma.eventFile.update({
        where: { id: fileId },
        data: {
          extractedText: extractedText,
          textExtractedAt: new Date(),
        }
      });

      console.log(`Text extracted successfully for file: ${file.fileName} (${extractedText.length} chars)`);

      // Audit logging - non-critical
      try {
        await logCrud('UPDATE', 'events', 'extract-text', fileId,
          `חולץ טקסט לקובץ: ${file.fileName}`, {
          eventFileId: fileId,
          fileName: file.fileName,
          fileType: file.fileType,
          textLength: extractedText.length,
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }

      return NextResponse.json({
        success: true,
        textLength: extractedText.length,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Could not extract text from file'
      });
    }

  } catch (error) {
    console.error('Error in text extraction API:', error);
    return NextResponse.json(
      { error: 'Failed to extract text', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
    }

    const file = await prisma.eventFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        extractedText: true,
        textExtractedAt: true,
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      fileId: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      hasExtractedText: !!file.extractedText,
      textLength: file.extractedText?.length || 0,
      extractedAt: file.textExtractedAt,
    });

  } catch (error) {
    console.error('Error fetching file info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file info', details: String(error) },
      { status: 500 }
    );
  }
}
