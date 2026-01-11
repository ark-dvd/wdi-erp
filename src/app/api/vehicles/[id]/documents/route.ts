// ============================================
// src/app/api/vehicles/[id]/documents/route.ts
// Version: 20260111-220000
// Fixed: proper try/catch structure with auth
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logCrud } from '@/lib/activity'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: { licensePlate: true }
    })
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
    
    const document = await prisma.vehicleDocument.create({
      data: {
        vehicleId: params.id,
        type: data.type,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        fileUrl: data.fileUrl || null,
        notes: data.notes || null,
      }
    })
    
    await logCrud('CREATE', 'vehicles', 'document', document.id,
      `מסמך ${data.type} - ${vehicle.licensePlate}`, {
      vehicleId: params.id,
      type: data.type,
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
    }
    
    const document = await prisma.vehicleDocument.findUnique({
      where: { id: documentId },
      include: { vehicle: { select: { licensePlate: true } } }
    })
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    
    await prisma.vehicleDocument.delete({ where: { id: documentId } })
    
    await logCrud('DELETE', 'vehicles', 'document', documentId,
      `מסמך ${document.type} - ${document.vehicle.licensePlate}`, {
      vehicleId: params.id,
      type: document.type,
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
