// ============================================
// src/app/api/vehicles/[id]/documents/route.ts
// Version: 20260112-000000
// Added: auth check for all functions
// Added: logCrud for CREATE, DELETE
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCrud } from '@/lib/activity'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    if (!data.type) {
      return NextResponse.json({ error: 'חובה לבחור סוג מסמך' }, { status: 400 })
    }
    if (!data.fileUrl) {
      return NextResponse.json({ error: 'חובה להעלות קובץ' }, { status: 400 })
    }
    
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: params.id },
      select: { licensePlate: true, manufacturer: true, model: true }
    })
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
    
    // Logging - added
    await logCrud('CREATE', 'vehicles', 'document', document.id,
      `מסמך ${vehicle.licensePlate} - ${data.type}`, {
      vehicleId: params.id,
      vehicleName: `${vehicle.manufacturer} ${vehicle.model}`,
      documentType: data.type,
      fileName: data.fileName,
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json({ error: 'חסר מזהה מסמך' }, { status: 400 })
    }
    
    const document = await prisma.vehicleDocument.findUnique({
      where: { id: documentId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!document || document.vehicleId !== params.id) {
      return NextResponse.json({ error: 'מסמך לא נמצא' }, { status: 404 })
    }
    
    await prisma.vehicleDocument.delete({
      where: { id: documentId }
    })
    
    // Logging - added
    await logCrud('DELETE', 'vehicles', 'document', documentId,
      `מסמך ${document.vehicle.licensePlate} - ${document.type}`, {
      vehicleId: params.id,
      documentType: document.type,
      fileName: document.fileName,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
