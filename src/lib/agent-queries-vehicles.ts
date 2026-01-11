// ================================================
// WDI ERP - Agent Queries for Vehicles
// Version: 20260111-150500
// ================================================

import { prisma } from './prisma';

export async function getVehicles(params: {
  status?: string;
  manufacturer?: string;
  contractType?: string;
}) {
  const where: any = {};
  
  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }
  if (params.manufacturer) {
    where.manufacturer = { contains: params.manufacturer, mode: 'insensitive' };
  }
  if (params.contractType) {
    where.contractType = params.contractType;
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      currentDriver: {
        select: { id: true, firstName: true, lastName: true }
      }
    },
    orderBy: { licensePlate: 'asc' },
  });

  return vehicles.map(v => ({
    id: v.id,
    licensePlate: v.licensePlate,
    manufacturer: v.manufacturer,
    model: v.model,
    year: v.year,
    color: v.color,
    status: v.status,
    contractType: v.contractType,
    currentKm: v.currentKm,
    currentDriver: v.currentDriver 
      ? `${v.currentDriver.firstName} ${v.currentDriver.lastName}`
      : null,
    nextServiceDate: v.nextServiceDate,
    nextServiceKm: v.nextServiceKm,
  }));
}

export async function getVehicleById(params: { searchTerm: string }) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      licensePlate: { contains: params.searchTerm, mode: 'insensitive' }
    },
    include: {
      currentDriver: {
        select: { id: true, firstName: true, lastName: true, phone: true }
      },
      assignments: {
        include: {
          employee: { select: { firstName: true, lastName: true } }
        },
        orderBy: { startDate: 'desc' },
        take: 10
      },
      fuelLogs: {
        orderBy: { date: 'desc' },
        take: 5
      },
      services: {
        orderBy: { serviceDate: 'desc' },
        take: 5
      },
      accidents: {
        orderBy: { date: 'desc' },
        take: 5
      },
      tickets: {
        orderBy: { date: 'desc' },
        take: 5
      },
    },
  });

  if (!vehicle) return null;

  return {
    id: vehicle.id,
    licensePlate: vehicle.licensePlate,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    status: vehicle.status,
    contractType: vehicle.contractType,
    leasingCompany: vehicle.leasingCompany,
    contractStartDate: vehicle.contractStartDate,
    contractEndDate: vehicle.contractEndDate,
    monthlyPayment: vehicle.monthlyPayment,
    currentKm: vehicle.currentKm,
    lastServiceDate: vehicle.lastServiceDate,
    lastServiceKm: vehicle.lastServiceKm,
    nextServiceDate: vehicle.nextServiceDate,
    nextServiceKm: vehicle.nextServiceKm,
    notes: vehicle.notes,
    currentDriver: vehicle.currentDriver 
      ? {
          name: `${vehicle.currentDriver.firstName} ${vehicle.currentDriver.lastName}`,
          phone: vehicle.currentDriver.phone
        }
      : null,
    recentAssignments: vehicle.assignments.map(a => ({
      driver: `${a.employee.firstName} ${a.employee.lastName}`,
      startDate: a.startDate,
      endDate: a.endDate,
      startKm: a.startKm,
      endKm: a.endKm,
    })),
    recentFuelLogs: vehicle.fuelLogs.map(f => ({
      date: f.date,
      liters: f.liters,
      totalCost: f.totalCost,
      mileage: f.mileage,
      station: f.station,
    })),
    recentServices: vehicle.services.map(s => ({
      date: s.serviceDate,
      type: s.serviceType,
      cost: s.cost,
      garage: s.garage,
      mileage: s.mileage,
    })),
    recentAccidents: vehicle.accidents.map(a => ({
      date: a.date,
      location: a.location,
      status: a.status,
      cost: a.cost,
    })),
    recentTickets: vehicle.tickets.map(t => ({
      date: t.date,
      type: t.ticketType,
      amount: t.fineAmount,
      status: t.status,
    })),
  };
}

export async function getVehicleByDriver(params: { driverName: string }) {
  const nameParts = params.driverName.split(' ');
  
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { firstName: { contains: nameParts[0], mode: 'insensitive' } },
        { lastName: { contains: nameParts[nameParts.length - 1], mode: 'insensitive' } },
      ]
    },
    include: {
      currentVehicle: true
    }
  });

  if (!employee?.currentVehicle) return null;

  const v = employee.currentVehicle;
  return {
    driverName: `${employee.firstName} ${employee.lastName}`,
    licensePlate: v.licensePlate,
    manufacturer: v.manufacturer,
    model: v.model,
    year: v.year,
    color: v.color,
    currentKm: v.currentKm,
    status: v.status,
  };
}

export async function getVehicleFuelLogs(params: {
  licensePlate?: string;
  daysBack?: number;
  limit?: number;
}) {
  const where: any = {};
  
  if (params.licensePlate) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { licensePlate: { contains: params.licensePlate, mode: 'insensitive' } }
    });
    if (vehicle) {
      where.vehicleId = vehicle.id;
    }
  }

  const daysBack = params.daysBack || 30;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysBack);
  where.date = { gte: fromDate };

  const fuelLogs = await prisma.vehicleFuelLog.findMany({
    where,
    include: {
      vehicle: { select: { licensePlate: true, manufacturer: true, model: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: 'desc' },
    take: params.limit || 20,
  });

  return fuelLogs.map(f => ({
    date: f.date,
    vehicle: `${f.vehicle.manufacturer} ${f.vehicle.model} (${f.vehicle.licensePlate})`,
    driver: f.employee ? `${f.employee.firstName} ${f.employee.lastName}` : null,
    liters: f.liters,
    pricePerLiter: f.pricePerLiter,
    totalCost: f.totalCost,
    mileage: f.mileage,
    station: f.station,
    fuelType: f.fuelType,
  }));
}

export async function getVehicleServices(params: {
  licensePlate?: string;
  limit?: number;
}) {
  const where: any = {};
  
  if (params.licensePlate) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { licensePlate: { contains: params.licensePlate, mode: 'insensitive' } }
    });
    if (vehicle) {
      where.vehicleId = vehicle.id;
    }
  }

  const services = await prisma.vehicleService.findMany({
    where,
    include: {
      vehicle: { select: { licensePlate: true, manufacturer: true, model: true } },
    },
    orderBy: { serviceDate: 'desc' },
    take: params.limit || 20,
  });

  return services.map(s => ({
    date: s.serviceDate,
    vehicle: `${s.vehicle.manufacturer} ${s.vehicle.model} (${s.vehicle.licensePlate})`,
    type: s.serviceType,
    cost: s.cost,
    garage: s.garage,
    mileage: s.mileage,
    description: s.description,
  }));
}

export async function getVehicleAccidents(params: {
  licensePlate?: string;
  status?: string;
}) {
  const where: any = {};
  
  if (params.licensePlate) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { licensePlate: { contains: params.licensePlate, mode: 'insensitive' } }
    });
    if (vehicle) {
      where.vehicleId = vehicle.id;
    }
  }

  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }

  const accidents = await prisma.vehicleAccident.findMany({
    where,
    include: {
      vehicle: { select: { licensePlate: true, manufacturer: true, model: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: 'desc' },
  });

  return accidents.map(a => ({
    date: a.date,
    vehicle: `${a.vehicle.manufacturer} ${a.vehicle.model} (${a.vehicle.licensePlate})`,
    driver: a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : null,
    location: a.location,
    description: a.description,
    thirdParty: a.thirdParty,
    policeReport: a.policeReport,
    cost: a.cost,
    insuranceClaim: a.insuranceClaim,
    status: a.status,
  }));
}

export async function getVehicleTickets(params: {
  licensePlate?: string;
  status?: string;
}) {
  const where: any = {};
  
  if (params.licensePlate) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { licensePlate: { contains: params.licensePlate, mode: 'insensitive' } }
    });
    if (vehicle) {
      where.vehicleId = vehicle.id;
    }
  }

  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }

  const tickets = await prisma.vehicleTicket.findMany({
    where,
    include: {
      vehicle: { select: { licensePlate: true, manufacturer: true, model: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: 'desc' },
  });

  return tickets.map(t => ({
    date: t.date,
    vehicle: `${t.vehicle.manufacturer} ${t.vehicle.model} (${t.vehicle.licensePlate})`,
    driver: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : null,
    type: t.ticketType,
    location: t.location,
    fineAmount: t.fineAmount,
    dueDate: t.dueDate,
    status: t.status,
  }));
}

export async function countVehicles(params: {
  status?: string;
  groupBy?: string;
}) {
  if (params.groupBy) {
    const vehicles = await prisma.vehicle.groupBy({
      by: [params.groupBy as any],
      _count: true,
    });
    return vehicles.map(g => ({
      [params.groupBy!]: (g as any)[params.groupBy!],
      count: g._count,
    }));
  }

  const where: any = {};
  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }

  const count = await prisma.vehicle.count({ where });
  return { total: count };
}

export async function getVehiclesStats() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: 'ACTIVE' },
    include: {
      fuelLogs: {
        where: {
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      services: {
        orderBy: { serviceDate: 'desc' },
        take: 1
      }
    }
  });

  const totalVehicles = vehicles.length;
  
  // חישוב עלויות דלק חודשיות
  const monthlyFuelCost = vehicles.reduce((sum, v) => {
    return sum + v.fuelLogs.reduce((fuelSum, f) => fuelSum + f.totalCost, 0);
  }, 0);

  // חישוב ממוצע צריכת דלק
  const totalLiters = vehicles.reduce((sum, v) => {
    return sum + v.fuelLogs.reduce((litersSum, f) => litersSum + f.liters, 0);
  }, 0);

  // רכבים לפי יצרן
  const byManufacturer: Record<string, number> = {};
  vehicles.forEach(v => {
    byManufacturer[v.manufacturer] = (byManufacturer[v.manufacturer] || 0) + 1;
  });

  // רכבים שצריכים טיפול
  const needingService = vehicles.filter(v => {
    if (v.nextServiceDate && v.nextServiceDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      return true;
    }
    if (v.nextServiceKm && v.currentKm && v.currentKm >= v.nextServiceKm - 1000) {
      return true;
    }
    return false;
  }).length;

  return {
    totalActiveVehicles: totalVehicles,
    monthlyFuelCost,
    totalLitersThisMonth: totalLiters,
    averageLitersPerVehicle: totalVehicles > 0 ? Math.round(totalLiters / totalVehicles) : 0,
    vehiclesNeedingService: needingService,
    byManufacturer,
  };
}

export async function getVehiclesNeedingService(params: { daysAhead?: number }) {
  const daysAhead = params.daysAhead || 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { nextServiceDate: { lte: futureDate } },
      ]
    },
    include: {
      currentDriver: { select: { firstName: true, lastName: true } }
    },
    orderBy: { nextServiceDate: 'asc' }
  });

  // גם רכבים שהגיעו לק"מ טיפול
  const byKm = await prisma.vehicle.findMany({
    where: {
      status: 'ACTIVE',
      nextServiceKm: { not: null },
    },
    include: {
      currentDriver: { select: { firstName: true, lastName: true } }
    }
  });

  const needingByKm = byKm.filter(v => 
    v.currentKm && v.nextServiceKm && v.currentKm >= v.nextServiceKm - 1000
  );

  // מיזוג ללא כפילויות
  const allIds = new Set(vehicles.map(v => v.id));
  const combined = [...vehicles];
  needingByKm.forEach(v => {
    if (!allIds.has(v.id)) {
      combined.push(v);
    }
  });

  return combined.map(v => ({
    licensePlate: v.licensePlate,
    manufacturer: v.manufacturer,
    model: v.model,
    currentDriver: v.currentDriver 
      ? `${v.currentDriver.firstName} ${v.currentDriver.lastName}`
      : null,
    currentKm: v.currentKm,
    nextServiceDate: v.nextServiceDate,
    nextServiceKm: v.nextServiceKm,
    reason: v.nextServiceDate && v.nextServiceDate <= futureDate 
      ? 'תאריך טיפול קרוב'
      : 'ק"מ לטיפול קרוב',
  }));
}
