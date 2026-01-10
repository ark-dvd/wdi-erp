// ============================================
// src/app/api/vehicles/[id]/documents/route.ts
// Version: 20260110-070000
// GET - רשימת מסמכי רכב
// POST - העלאת מסמך חדש
// DELETE - מחיקת מסמך
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documents = await prisma.vehicleDocument.findMany({
      where: { vehicleId: params.id },
      orderBy: [{ type: 'asc' }, { expiryDate: 'desc' }]
    })
    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    
    if (!data.type) {
      return NextResponse.json({ error: 'חובה לבחור סוג מסמך' }, { status: 400 })
    }
    if (!data.fileUrl) {
      return NextResponse.json({ error: 'חובה להעלות קובץ' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } })
    if (!vehicle) {
      return NextResponse.json({ error: 'רכב לא נמצא' }, { status: 404 })
    }
    
    const document = await prisma.vehicleDocument.create({
      data: {
        vehicleId: params.id,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName || 'מסמך',
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        notes: data.notes || null,
        createdBy: data.createdBy || null,
      }
    })
    
    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json({ error: 'חסר מזהה מסמך' }, { status: 400 })
    }
    
    const document = await prisma.vehicleDocument.findUnique({
      where: { id: documentId }
    })
    
    if (!document || document.vehicleId !== params.id) {
      return NextResponse.json({ error: 'מסמך לא נמצא' }, { status: 404 })
    }
    
    await prisma.vehicleDocument.delete({
      where: { id: documentId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
