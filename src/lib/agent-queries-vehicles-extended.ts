// ================================================
// WDI ERP - Agent Queries for Vehicles (Extended)
// Version: 20260116-093000
// Changes: Added VehicleDocument, VehiclePhoto, TollRoad, Parking functions
// ================================================

import { prisma } from './prisma';

// ============ VEHICLE DOCUMENTS ============

/**
 * מחזיר מסמכי רכב (רישיון, ביטוח, בדיקת חורף)
 * @param licensePlate - מספר רישוי (ריק = כל הרכבים)
 * @param type - סוג מסמך: LICENSE, INSURANCE, WINTER_CHECK
 * @param expiringInDays - מסמכים שפגים בתוך X ימים
 */
export async function getVehicleDocuments(params: {
  licensePlate?: string;
  type?: string;
  expiringInDays?: number;
}) {
  const where: any = {};
  
  if (params.licensePlate) {
    where.vehicle = { licensePlate: params.licensePlate };
  }
  
  if (params.type) {
    where.type = params.type;
  }
  
  // מסמכים שפגים בקרוב
  if (params.expiringInDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + params.expiringInDays);
    where.expiryDate = {
      lte: futureDate,
      gte: new Date(), // רק מסמכים שעדיין בתוקף
    };
  }

  const documents = await prisma.vehicleDocument.findMany({
    where,
    include: {
      vehicle: {
        select: {
          licensePlate: true,
          manufacturer: true,
          model: true,
          currentDriver: {
            select: { firstName: true, lastName: true }
          }
        }
      }
    },
    orderBy: { expiryDate: 'asc' },
  });

  return documents.map(d => ({
    id: d.id,
    type: d.type,
    typeHeb: translateDocumentType(d.type),
    fileName: d.fileName,
    fileUrl: d.fileUrl,
    issueDate: d.issueDate,
    expiryDate: d.expiryDate,
    daysUntilExpiry: d.expiryDate ? Math.ceil((d.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    isExpired: d.expiryDate ? d.expiryDate < new Date() : false,
    notes: d.notes,
    vehicle: {
      licensePlate: d.vehicle.licensePlate,
      description: `${d.vehicle.manufacturer} ${d.vehicle.model}`,
      currentDriver: d.vehicle.currentDriver 
        ? `${d.vehicle.currentDriver.firstName} ${d.vehicle.currentDriver.lastName}`
        : null
    }
  }));
}

/**
 * מחזיר רכבים עם מסמכים שפגו או עומדים לפוג
 */
export async function getVehiclesWithExpiringDocuments(params: {
  daysAhead?: number;
  includeExpired?: boolean;
}) {
  const daysAhead = params.daysAhead || 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  const whereExpiry: any = {
    expiryDate: { lte: futureDate }
  };
  
  if (!params.includeExpired) {
    whereExpiry.expiryDate = {
      ...whereExpiry.expiryDate,
      gte: new Date()
    };
  }

  const documents = await prisma.vehicleDocument.findMany({
    where: whereExpiry,
    include: {
      vehicle: {
        select: {
          id: true,
          licensePlate: true,
          manufacturer: true,
          model: true,
          status: true,
          currentDriver: {
            select: { firstName: true, lastName: true }
          }
        }
      }
    },
    orderBy: { expiryDate: 'asc' },
  });

  // קיבוץ לפי רכב
  const vehicleMap = new Map<string, any>();
  
  for (const doc of documents) {
    const key = doc.vehicle.licensePlate;
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, {
        licensePlate: doc.vehicle.licensePlate,
        description: `${doc.vehicle.manufacturer} ${doc.vehicle.model}`,
        status: doc.vehicle.status,
        currentDriver: doc.vehicle.currentDriver 
          ? `${doc.vehicle.currentDriver.firstName} ${doc.vehicle.currentDriver.lastName}`
          : null,
        expiringDocuments: []
      });
    }
    
    vehicleMap.get(key).expiringDocuments.push({
      type: doc.type,
      typeHeb: translateDocumentType(doc.type),
      expiryDate: doc.expiryDate,
      daysUntilExpiry: doc.expiryDate ? Math.ceil((doc.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      isExpired: doc.expiryDate ? doc.expiryDate < new Date() : false,
    });
  }

  return Array.from(vehicleMap.values());
}

// ============ VEHICLE PHOTOS ============

/**
 * מחזיר תמונות רכב
 * @param licensePlate - מספר רישוי
 * @param eventType - סוג אירוע: HANDOVER_IN, HANDOVER_OUT, ACCIDENT, SERVICE, GENERAL
 * @param photoType - סוג תמונה: FRONT, REAR, RIGHT_SIDE, LEFT_SIDE, INTERIOR, OTHER
 */
export async function getVehiclePhotos(params: {
  licensePlate?: string;
  eventType?: string;
  photoType?: string;
  assignmentId?: string;
  limit?: number;
}) {
  const where: any = {};
  
  if (params.licensePlate) {
    where.vehicle = { licensePlate: params.licensePlate };
  }
  
  if (params.eventType) {
    where.eventType = params.eventType;
  }
  
  if (params.photoType) {
    where.photoType = params.photoType;
  }
  
  if (params.assignmentId) {
    where.assignmentId = params.assignmentId;
  }

  const photos = await prisma.vehiclePhoto.findMany({
    where,
    include: {
      vehicle: {
        select: {
          licensePlate: true,
          manufacturer: true,
          model: true,
        }
      },
      assignment: {
        select: {
          employee: {
            select: { firstName: true, lastName: true }
          },
          startDate: true,
          endDate: true,
        }
      }
    },
    orderBy: { takenAt: 'desc' },
    take: params.limit || 50,
  });

  return photos.map(p => ({
    id: p.id,
    photoType: p.photoType,
    photoTypeHeb: translatePhotoType(p.photoType),
    eventType: p.eventType,
    eventTypeHeb: translatePhotoEventType(p.eventType),
    fileUrl: p.fileUrl,
    fileName: p.fileName,
    takenAt: p.takenAt,
    notes: p.notes,
    vehicle: {
      licensePlate: p.vehicle.licensePlate,
      description: `${p.vehicle.manufacturer} ${p.vehicle.model}`,
    },
    assignment: p.assignment ? {
      employee: `${p.assignment.employee.firstName} ${p.assignment.employee.lastName}`,
      startDate: p.assignment.startDate,
      endDate: p.assignment.endDate,
    } : null,
  }));
}

/**
 * מחזיר תמונות מסירה/קבלה של רכב ספציפי
 */
export async function getVehicleHandoverPhotos(params: {
  licensePlate: string;
  handoverType?: 'in' | 'out' | 'both';
}) {
  const eventTypes: string[] = [];
  
  if (!params.handoverType || params.handoverType === 'both') {
    eventTypes.push('HANDOVER_IN', 'HANDOVER_OUT');
  } else if (params.handoverType === 'in') {
    eventTypes.push('HANDOVER_IN');
  } else {
    eventTypes.push('HANDOVER_OUT');
  }

  const photos = await prisma.vehiclePhoto.findMany({
    where: {
      vehicle: { licensePlate: params.licensePlate },
      eventType: { in: eventTypes }
    },
    include: {
      assignment: {
        select: {
          employee: {
            select: { firstName: true, lastName: true }
          },
          startDate: true,
          endDate: true,
        }
      }
    },
    orderBy: { takenAt: 'desc' },
  });

  // קיבוץ לפי שיוך
  const byAssignment = new Map<string, any>();
  
  for (const photo of photos) {
    const key = photo.assignmentId || 'unassigned';
    if (!byAssignment.has(key)) {
      byAssignment.set(key, {
        assignmentId: photo.assignmentId,
        employee: photo.assignment 
          ? `${photo.assignment.employee.firstName} ${photo.assignment.employee.lastName}`
          : 'לא משויך',
        startDate: photo.assignment?.startDate,
        endDate: photo.assignment?.endDate,
        handoverIn: [],
        handoverOut: [],
      });
    }
    
    const group = byAssignment.get(key);
    const photoData = {
      id: photo.id,
      photoType: photo.photoType,
      photoTypeHeb: translatePhotoType(photo.photoType),
      fileUrl: photo.fileUrl,
      takenAt: photo.takenAt,
      notes: photo.notes,
    };
    
    if (photo.eventType === 'HANDOVER_IN') {
      group.handoverIn.push(photoData);
    } else {
      group.handoverOut.push(photoData);
    }
  }

  return Array.from(byAssignment.values());
}

// ============ TOLL ROADS ============

/**
 * מחזיר נסיעות כביש אגרה
 * @param licensePlate - מספר רישוי (ריק = כל הרכבים)
 * @param daysBack - כמה ימים אחורה (ברירת מחדל: 30)
 * @param road - סינון לפי כביש (למשל: "כביש 6")
 */
export async function getVehicleTollRoads(params: {
  licensePlate?: string;
  daysBack?: number;
  road?: string;
  employeeName?: string;
}) {
  const daysBack = params.daysBack || 30;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  
  const where: any = {
    date: { gte: fromDate }
  };
  
  if (params.licensePlate) {
    where.vehicle = { licensePlate: params.licensePlate };
  }
  
  if (params.road) {
    where.road = { contains: params.road, mode: 'insensitive' };
  }
  
  if (params.employeeName) {
    where.employee = {
      OR: [
        { firstName: { contains: params.employeeName, mode: 'insensitive' } },
        { lastName: { contains: params.employeeName, mode: 'insensitive' } },
      ]
    };
  }

  const tolls = await prisma.vehicleTollRoad.findMany({
    where,
    include: {
      vehicle: {
        select: {
          licensePlate: true,
          manufacturer: true,
          model: true,
        }
      },
      employee: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { date: 'desc' },
  });

  return tolls.map(t => ({
    id: t.id,
    date: t.date,
    road: t.road,
    entryPoint: t.entryPoint,
    exitPoint: t.exitPoint,
    cost: t.cost,
    invoiceNum: t.invoiceNum,
    notes: t.notes,
    vehicle: {
      licensePlate: t.vehicle.licensePlate,
      description: `${t.vehicle.manufacturer} ${t.vehicle.model}`,
    },
    employee: t.employee 
      ? `${t.employee.firstName} ${t.employee.lastName}`
      : null,
  }));
}

/**
 * מחזיר סטטיסטיקות כביש אגרה
 */
export async function getTollRoadStats(params: {
  daysBack?: number;
  groupBy?: 'vehicle' | 'employee' | 'road' | 'month';
}) {
  const daysBack = params.daysBack || 90;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);

  const tolls = await prisma.vehicleTollRoad.findMany({
    where: { date: { gte: fromDate } },
    include: {
      vehicle: { select: { licensePlate: true, manufacturer: true, model: true } },
      employee: { select: { firstName: true, lastName: true } }
    }
  });

  const totalCost = tolls.reduce((sum, t) => sum + t.cost, 0);
  const totalTrips = tolls.length;

  // קיבוץ לפי הפרמטר
  const grouped: Record<string, { count: number; cost: number; label: string }> = {};
  
  for (const toll of tolls) {
    let key: string;
    let label: string;
    
    switch (params.groupBy) {
      case 'vehicle':
        key = toll.vehicle.licensePlate;
        label = `${toll.vehicle.licensePlate} - ${toll.vehicle.manufacturer} ${toll.vehicle.model}`;
        break;
      case 'employee':
        key = toll.employee ? `${toll.employee.firstName} ${toll.employee.lastName}` : 'לא משויך';
        label = key;
        break;
      case 'road':
        key = toll.road;
        label = toll.road;
        break;
      case 'month':
      default:
        const month = toll.date.toISOString().substring(0, 7);
        key = month;
        label = month;
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = { count: 0, cost: 0, label };
    }
    grouped[key].count++;
    grouped[key].cost += toll.cost;
  }

  return {
    period: `${daysBack} ימים אחרונים`,
    totalTrips,
    totalCost,
    averageCostPerTrip: totalTrips > 0 ? totalCost / totalTrips : 0,
    breakdown: Object.values(grouped).sort((a, b) => b.cost - a.cost),
  };
}

// ============ PARKING ============

/**
 * מחזיר חניות
 * @param licensePlate - מספר רישוי (ריק = כל הרכבים)
 * @param daysBack - כמה ימים אחורה (ברירת מחדל: 30)
 * @param location - מיקום החניה
 */
export async function getVehicleParkings(params: {
  licensePlate?: string;
  daysBack?: number;
  location?: string;
  employeeName?: string;
}) {
  const daysBack = params.daysBack || 30;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  
  const where: any = {
    date: { gte: fromDate }
  };
  
  if (params.licensePlate) {
    where.vehicle = { licensePlate: params.licensePlate };
  }
  
  if (params.location) {
    where.OR = [
      { location: { contains: params.location, mode: 'insensitive' } },
      { parkingLot: { contains: params.location, mode: 'insensitive' } },
    ];
  }
  
  if (params.employeeName) {
    where.employee = {
      OR: [
        { firstName: { contains: params.employeeName, mode: 'insensitive' } },
        { lastName: { contains: params.employeeName, mode: 'insensitive' } },
      ]
    };
  }

  const parkings = await prisma.vehicleParking.findMany({
    where,
    include: {
      vehicle: {
        select: {
          licensePlate: true,
          manufacturer: true,
          model: true,
        }
      },
      employee: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { date: 'desc' },
  });

  return parkings.map(p => ({
    id: p.id,
    date: p.date,
    location: p.location,
    parkingLot: p.parkingLot,
    duration: p.duration,
    durationFormatted: p.duration ? formatDuration(p.duration) : null,
    cost: p.cost,
    receiptUrl: p.receiptUrl,
    notes: p.notes,
    vehicle: {
      licensePlate: p.vehicle.licensePlate,
      description: `${p.vehicle.manufacturer} ${p.vehicle.model}`,
    },
    employee: p.employee 
      ? `${p.employee.firstName} ${p.employee.lastName}`
      : null,
  }));
}

/**
 * מחזיר סטטיסטיקות חניות
 */
export async function getParkingStats(params: {
  daysBack?: number;
  groupBy?: 'vehicle' | 'employee' | 'location' | 'month';
}) {
  const daysBack = params.daysBack || 90;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);

  const parkings = await prisma.vehicleParking.findMany({
    where: { date: { gte: fromDate } },
    include: {
      vehicle: { select: { licensePlate: true, manufacturer: true, model: true } },
      employee: { select: { firstName: true, lastName: true } }
    }
  });

  const totalCost = parkings.reduce((sum, p) => sum + p.cost, 0);
  const totalParkings = parkings.length;
  const totalDuration = parkings.reduce((sum, p) => sum + (p.duration || 0), 0);

  // קיבוץ לפי הפרמטר
  const grouped: Record<string, { count: number; cost: number; duration: number; label: string }> = {};
  
  for (const parking of parkings) {
    let key: string;
    let label: string;
    
    switch (params.groupBy) {
      case 'vehicle':
        key = parking.vehicle.licensePlate;
        label = `${parking.vehicle.licensePlate} - ${parking.vehicle.manufacturer} ${parking.vehicle.model}`;
        break;
      case 'employee':
        key = parking.employee ? `${parking.employee.firstName} ${parking.employee.lastName}` : 'לא משויך';
        label = key;
        break;
      case 'location':
        key = parking.location;
        label = parking.location;
        break;
      case 'month':
      default:
        const month = parking.date.toISOString().substring(0, 7);
        key = month;
        label = month;
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = { count: 0, cost: 0, duration: 0, label };
    }
    grouped[key].count++;
    grouped[key].cost += parking.cost;
    grouped[key].duration += parking.duration || 0;
  }

  return {
    period: `${daysBack} ימים אחרונים`,
    totalParkings,
    totalCost,
    totalDuration,
    totalDurationFormatted: formatDuration(totalDuration),
    averageCostPerParking: totalParkings > 0 ? totalCost / totalParkings : 0,
    breakdown: Object.values(grouped)
      .map(g => ({ ...g, durationFormatted: formatDuration(g.duration) }))
      .sort((a, b) => b.cost - a.cost),
  };
}

// ============ VEHICLE ASSIGNMENTS ============

/**
 * מחזיר היסטוריית שיוכי רכב
 */
export async function getVehicleAssignments(params: {
  licensePlate?: string;
  employeeName?: string;
  current?: boolean;
}) {
  const where: any = {};
  
  if (params.licensePlate) {
    where.vehicle = { licensePlate: params.licensePlate };
  }
  
  if (params.employeeName) {
    where.employee = {
      OR: [
        { firstName: { contains: params.employeeName, mode: 'insensitive' } },
        { lastName: { contains: params.employeeName, mode: 'insensitive' } },
      ]
    };
  }
  
  if (params.current) {
    where.endDate = null;
  }

  const assignments = await prisma.vehicleAssignment.findMany({
    where,
    include: {
      vehicle: {
        select: {
          licensePlate: true,
          manufacturer: true,
          model: true,
          year: true,
        }
      },
      employee: {
        select: { firstName: true, lastName: true, role: true }
      },
      photos: {
        select: { id: true, photoType: true, eventType: true }
      }
    },
    orderBy: { startDate: 'desc' },
  });

  return assignments.map(a => ({
    id: a.id,
    startDate: a.startDate,
    endDate: a.endDate,
    isActive: !a.endDate,
    startKm: a.startKm,
    endKm: a.endKm,
    kmDriven: a.endKm && a.startKm ? a.endKm - a.startKm : null,
    notes: a.notes,
    vehicle: {
      licensePlate: a.vehicle.licensePlate,
      description: `${a.vehicle.manufacturer} ${a.vehicle.model} (${a.vehicle.year || 'N/A'})`,
    },
    employee: `${a.employee.firstName} ${a.employee.lastName}`,
    employeeRole: a.employee.role,
    photosCount: {
      handoverIn: a.photos.filter(p => p.eventType === 'HANDOVER_IN').length,
      handoverOut: a.photos.filter(p => p.eventType === 'HANDOVER_OUT').length,
      total: a.photos.length,
    }
  }));
}

// ============ HELPER FUNCTIONS ============

function translateDocumentType(type: string): string {
  const map: Record<string, string> = {
    'LICENSE': 'רישיון רכב',
    'INSURANCE': 'ביטוח',
    'WINTER_CHECK': 'בדיקת חורף',
  };
  return map[type] || type;
}

function translatePhotoType(type: string): string {
  const map: Record<string, string> = {
    'FRONT': 'חזית',
    'REAR': 'אחור',
    'RIGHT_SIDE': 'צד ימין',
    'LEFT_SIDE': 'צד שמאל',
    'INTERIOR': 'פנים',
    'OTHER': 'אחר',
  };
  return map[type] || type;
}

function translatePhotoEventType(type: string): string {
  const map: Record<string, string> = {
    'HANDOVER_IN': 'קבלה',
    'HANDOVER_OUT': 'מסירה',
    'GENERAL': 'כללי',
    'ACCIDENT': 'תאונה',
    'SERVICE': 'טיפול',
  };
  return map[type] || type;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} שעות`;
  return `${hours} שעות ו-${mins} דקות`;
}


