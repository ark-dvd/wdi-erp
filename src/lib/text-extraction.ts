// ================================================
// WDI ERP - Text Extraction Library
// Version: 20260111-180000
// Purpose: Extract text from PDF, PPTX, DOCX files
// ================================================

import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'wdi-erp-files';

/**
 * Extract text from a file stored in GCS
 * Supports: PDF, PPTX, DOCX
 */
export async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string | null> {
  try {
    // Download file from GCS
    const buffer = await downloadFileFromGCS(fileUrl);
    if (!buffer) {
      console.error('Failed to download file:', fileUrl);
      return null;
    }

    // Extract based on file type
    const mimeType = getMimeType(fileType, fileUrl);
    
    if (mimeType === 'application/pdf') {
      return await extractFromPDF(buffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return await extractFromPPTX(buffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractFromDOCX(buffer);
    } else {
      console.log('Unsupported file type for text extraction:', mimeType);
      return null;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return null;
  }
}

/**
 * Download file from GCS
 */
async function downloadFileFromGCS(fileUrl: string): Promise<Buffer | null> {
  try {
    let filePath = fileUrl;
    
    // Extract path from full GCS URL
    if (fileUrl.includes('storage.googleapis.com')) {
      const match = fileUrl.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
      if (match) filePath = decodeURIComponent(match[1]);
    }

    const file = storage.bucket(bucketName).file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.error('File not found in GCS:', filePath);
      return null;
    }

    const [buffer] = await file.download();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Error downloading from GCS:', error);
    return null;
  }
}

/**
 * Get MIME type from fileType or URL extension
 */
function getMimeType(fileType: string, fileUrl: string): string {
  // If fileType is already a mime type
  if (fileType.includes('/')) {
    return fileType;
  }
  
  // Determine from extension
  const extension = fileUrl.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ppt': 'application/vnd.ms-powerpoint',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
  };
  
  return mimeTypes[extension || ''] || fileType;
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractFromPDF(buffer: Buffer): Promise<string | null> {
  try {
    // Dynamic import to avoid issues if package not installed
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return cleanText(data.text);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return null;
  }
}

/**
 * Extract text from PPTX using officeparser
 */
async function extractFromPPTX(buffer: Buffer): Promise<string | null> {
  try {
    const officeparser = await import('officeparser');
    const text = await officeparser.parseOfficeAsync(buffer);
    return cleanText(text);
  } catch (error) {
    console.error('Error parsing PPTX:', error);
    return null;
  }
}

/**
 * Extract text from DOCX using officeparser
 */
async function extractFromDOCX(buffer: Buffer): Promise<string | null> {
  try {
    const officeparser = await import('officeparser');
    const text = await officeparser.parseOfficeAsync(buffer);
    return cleanText(text);
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    return null;
  }
}

/**
 * Clean extracted text - remove excessive whitespace, normalize
 */
function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove excessive line breaks (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Check if file type supports text extraction
 */
export function supportsTextExtraction(fileType: string, fileUrl: string): boolean {
  const mimeType = getMimeType(fileType, fileUrl);
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/msword',
  ];
  
  return supportedTypes.includes(mimeType);
}
