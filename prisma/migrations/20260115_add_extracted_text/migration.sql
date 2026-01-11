-- Migration: Add extracted text fields to EventFile
-- Version: 20260115
-- Description: Enable text extraction from PDF/PPTX/DOCX files for AI Agent search

-- Add extractedText column to store the extracted text content
ALTER TABLE "EventFile" ADD COLUMN "extractedText" TEXT;

-- Add textExtractedAt timestamp to track when extraction was done
ALTER TABLE "EventFile" ADD COLUMN "textExtractedAt" TIMESTAMP(3);

-- Create index for full-text search on extractedText
-- Note: This is a basic index. For production, consider using PostgreSQL full-text search with GIN index
CREATE INDEX "EventFile_extractedText_idx" ON "EventFile" ("extractedText");
