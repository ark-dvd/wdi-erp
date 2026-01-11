// ================================================
// WDI ERP - Text Extraction API (Background Processing)
// Version: 20260111-180100
// Purpose: Extract text from event files asynchronously
// ================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth'
import { extractTextFromFile, supportsTextExtraction } from '@/lib/text-extraction';

/**
 * POST /api/extract-text
 * 
 * Extracts text from an event file and updates the database.
 * Called asynchronously after file upload - does not block user.
 * 
 * Body: { fileId: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }


    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Get file info from database
    const file = await prisma.eventFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        fileUrl: true,
        fileType: true,
        fileName: true,
        extractedText: true,
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Skip if already extracted
    if (file.extractedText) {
      return NextResponse.json({ 
        success: true, 
        message: 'Text already extracted',
        fileId: file.id 
      });
    }

    // Check if file type supports extraction
    if (!supportsTextExtraction(file.fileType, file.fileUrl)) {
      return NextResponse.json({ 
        success: true, 
        message: 'File type does not support text extraction',
        fileId: file.id,
        fileType: file.fileType
      });
    }

    // Extract text
    console.log(`Extracting text from file: ${file.fileName} (${file.id})`);
    const extractedText = await extractTextFromFile(file.fileUrl, file.fileType);

    if (extractedText) {
      // Update database with extracted text
      await prisma.eventFile.update({
        where: { id: fileId },
        data: {
          extractedText: extractedText,
          textExtractedAt: new Date(),
        }
      });

      console.log(`Text extracted successfully for file: ${file.fileName} (${extractedText.length} chars)`);

      return NextResponse.json({
        success: true,
        fileId: file.id,
        fileName: file.fileName,
        textLength: extractedText.length,
      });
    } else {
      console.log(`No text extracted from file: ${file.fileName}`);
      return NextResponse.json({
        success: true,
        fileId: file.id,
        message: 'No text could be extracted',
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

/**
 * GET /api/extract-text?fileId=xxx
 * 
 * Check extraction status for a file
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }


    const fileId = request.nextUrl.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
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
      hasExtractedText: !!file.extractedText,
      textLength: file.extractedText?.length || 0,
      extractedAt: file.textExtractedAt,
    });

  } catch (error) {
    console.error('Error checking extraction status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
