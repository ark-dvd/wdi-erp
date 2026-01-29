// ================================================
// WDI ERP - Agent Queries
// Version: 20260116-164000
// SECURITY: Sensitive fields redacted via agent-redaction.ts
// MVP FINAL - Normalizer, Redaction, Data Dictionary. NORMALIZATION: All status/type fields normalized via agent-normalizer.ts
// ================================================

import { prisma } from './prisma';

// ייבוא פונקציות רכבים
import {
  getVehicles,
  getVehicleById,
  getVehicleByDriver,
  getVehicleFuelLogs,
  getVehicleServices,
  getVehicleAccidents,
  getVehicleTickets,
  countVehicles,
  getVehiclesStats,
  getVehiclesNeedingService,
} from './agent-queries-vehicles';

// ייבוא פונקציות רכבים מורחבות (ללא תמונות - Agent לשאילתות נתונים בלבד)
import {
  getVehicleDocuments,
  getVehiclesWithExpiringDocuments,
  getVehicleTollRoads,
  getTollRoadStats,
  getVehicleParkings,
  getParkingStats,
  getVehicleAssignments,
} from './agent-queries-vehicles-extended';

// ייבוא Normalizer - שימוש אמיתי בכל הפונקציות
import {
  normalizeEmployeeStatus,
  normalizeProjectState,
  normalizeContactStatus,
} from './agent-normalizer';

// ייבוא Redaction - הסרת שדות רגישים
import {
  redactEmployeeData,
  redactEmployeesData,
} from './agent-redaction';

// ייבוא Data Dictionary
import {
  getSchemaCatalog,
  getFieldInfo,
  findFieldBySynonym,
} from './agent-data-dictionary';

// Stage 6.3 R4: ייבוא פונקציות ActivityLog
import {
  queryActivityLogs,
  getActivityLogStats,
  getEntityTimeline,
  getUserActivitySummary,
  getSecurityEvents,
  type ActivityLogEntry,
} from './activity';


// ============ EMPLOYEE FUNCTIONS ============

export async function getEmployees(params: {
  status?: string;
  department?: string;
  role?: string;
}) {
  const where: any = {};
  
  // **שימוש ב-normalizer**
  if (params.status && params.status !== 'all') {
    const normalizedStatus = normalizeEmployeeStatus(params.status);
    if (normalizedStatus && normalizedStatus !== 'all') {
      where.status = normalizedStatus;
    }
  }
  if (params.department) {
    where.department = { contains: params.department, mode: 'insensitive' };
  }
  if (params.role) {
    where.role = { contains: params.role, mode: 'insensitive' };
  }

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      department: true,
      status: true,
      phone: true,
      email: true,
      employmentType: true,
      employmentPercent: true,
      startDate: true,
      birthDate: true,
      // SECURITY: grossSalary, idNumber excluded
    },
    orderBy: { lastName: 'asc' },
  });

  return employees.map(e => ({
    ...e,
    fullName: `${e.firstName} ${e.lastName}`,
  }));
}
export async function getEmployeeById(params: { searchTerm: string }) {
  const searchTerm = params.searchTerm.trim();
  const searchParts = searchTerm.split(/\s+/); // פיצול לפי רווחים
  
  // בניית תנאי חיפוש
  const orConditions: any[] = [
    { idNumber: searchTerm },
    { idNumber: { contains: searchTerm } },
  ];
  
  // אם יש מילה אחת - חפש בשם פרטי או משפחה
  // אם יש שתי מילים - חפש שילוב של שם פרטי + משפחה
  if (searchParts.length === 1) {
    orConditions.push(
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } }
    );
  } else if (searchParts.length >= 2) {
    // חיפוש בכל הסדרים האפשריים
    for (const part of searchParts) {
      orConditions.push(
        { firstName: { contains: part, mode: 'insensitive' } },
        { lastName: { contains: part, mode: 'insensitive' } }
      );
    }
    // חיפוש משולב: שם פרטי + משפחה
    orConditions.push(
      { AND: [
        { firstName: { contains: searchParts[0], mode: 'insensitive' } },
        { lastName: { contains: searchParts[1], mode: 'insensitive' } }
      ]},
      { AND: [
        { firstName: { contains: searchParts[1], mode: 'insensitive' } },
        { lastName: { contains: searchParts[0], mode: 'insensitive' } }
      ]}
    );
  }
  
  const employee = await prisma.employee.findFirst({
    where: {
      OR: orConditions,
    },
    include: {
      ledProjects: {
        select: { id: true, name: true, projectNumber: true, phase: true, state: true },
      },
      managedProjects: {
        select: {
          project: {
            select: { id: true, name: true, projectNumber: true, phase: true, state: true },
          },
        },
      },
      coordinatedProjects: {
        include: {
          project: {
            select: { id: true, name: true, projectNumber: true, phase: true, state: true },
          },
        },
      },
    },
  });

  if (!employee) return null;

  // פרסור שדה ילדים מ-JSON
  let children: any[] = [];
  if (employee.children) {
    try {
      children = JSON.parse(employee.children);
    } catch (e) {
      children = [];
    }
  }

  // פרסור שדה השכלה מ-JSON
  let education: any[] = [];
  if (employee.education) {
    try {
      education = JSON.parse(employee.education);
    } catch (e) {
      education = [];
    }
  }

  // פרסור שדה הכשרות מ-JSON
  let certifications: any[] = [];
  if (employee.certifications) {
    try {
      certifications = JSON.parse(employee.certifications);
    } catch (e) {
      certifications = [];
    }
  }

  return {
    id: employee.id,
    fullName: `${employee.firstName} ${employee.lastName}`,
    // idNumber: removed (PII)
    role: employee.role,
    department: employee.department,
    phone: employee.phone,
    email: employee.email,
    personalEmail: employee.personalEmail,
    address: employee.address,
    linkedinUrl: employee.linkedinUrl,
    status: employee.status,
    employmentType: employee.employmentType,
    employmentPercent: employee.employmentPercent,
    employeeCategory: employee.employeeCategory,
    securityClearance: employee.securityClearance,
    startDate: employee.startDate,
    endDate: employee.endDate,
    birthDate: employee.birthDate,
    // salary: removed (sensitive)
    spouse: employee.spouseFirstName ? {
      name: `${employee.spouseFirstName} ${employee.spouseLastName || ''}`.trim(),
      // spouseIdNumber: removed (PII)
      birthDate: employee.spouseBirthDate,
      phone: employee.spousePhone,
      email: employee.spouseEmail,
    } : null,
    marriageDate: employee.marriageDate,
    children: children,
    childrenCount: children.length,
    education: education,
    certifications: certifications,
    ledProjects: employee.ledProjects,
    managedProjects: employee.managedProjects.map(pm => pm.project),
    coordinatedProjects: employee.coordinatedProjects.map(c => c.project),
  };
}

export async function getProjects(params: {
  state?: string;
  category?: string;
  phase?: string;
  leadId?: string;
  managerName?: string;
}) {
  const where: any = {};

  // **שימוש ב-normalizer**
  if (params.state && params.state !== 'all') {
    const normalizedState = normalizeProjectState(params.state);
    if (normalizedState && normalizedState !== 'all') {
      where.state = normalizedState;
    }
  }
  if (params.category) {
    where.category = { contains: params.category, mode: 'insensitive' };
  }
  if (params.phase) {
    where.phase = { contains: params.phase, mode: 'insensitive' };
  }
  if (params.leadId) {
    where.leadId = params.leadId;
  }
  if (params.managerName) {
    where.lead = {
      OR: [
        { firstName: { contains: params.managerName, mode: 'insensitive' } },
        { lastName: { contains: params.managerName, mode: 'insensitive' } },
      ],
    };
  }

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      projectNumber: true,
      name: true,
      category: true,
      phase: true,
      state: true,
      client: true,
      area: true,
      estimatedCost: true,
      startDate: true,
      projectType: true,
      level: true,
      lead: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return projects.map(p => ({
    ...p,
    leadName: p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : null,
  }));
}

export async function getProjectsByDomain(params: {
  domainName: string;
  state?: string;
}) {
  // First, find the domain by name (supports Hebrew displayName or English name)
  const domain = await prisma.domain.findFirst({
    where: {
      OR: [
        { name: { equals: params.domainName, mode: 'insensitive' } },
        { displayName: { contains: params.domainName, mode: 'insensitive' } },
      ],
    },
  });

  if (!domain) {
    return { error: `תחום "${params.domainName}" לא נמצא. תחומים קיימים: בטחוני, מסחרי, תעשייתי` };
  }

  const where: any = { domainId: domain.id };

  // Optional state filter
  if (params.state && params.state !== 'all') {
    const normalizedState = normalizeProjectState(params.state);
    if (normalizedState && normalizedState !== 'all') {
      where.state = normalizedState;
    }
  }

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      projectNumber: true,
      name: true,
      category: true,
      phase: true,
      state: true,
      client: true,
      area: true,
      estimatedCost: true,
      startDate: true,
      lead: {
        select: { firstName: true, lastName: true },
      },
      domain: {
        select: { displayName: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return {
    domain: domain.displayName,
    count: projects.length,
    projects: projects.map(p => ({
      ...p,
      leadName: p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : null,
      domainName: p.domain?.displayName || null,
    })),
  };
}

export async function getProjectById(params: { searchTerm: string }) {
  const searchTerm = params.searchTerm.trim();

  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { projectNumber: searchTerm },
        { projectNumber: { contains: searchTerm, mode: 'insensitive' } },
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { client: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      managers: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
          },
        },
      },
      coordinators: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      contactProjects: {
        include: {
          contact: {
            include: {
              organization: { select: { name: true } },
            },
          },
        },
      },
      events: {
        orderBy: { eventDate: 'desc' },
        take: 5,
        select: {
          id: true,
          eventType: true,
          description: true,
          eventDate: true,
        },
      },
      children: {
        select: { id: true, name: true, projectNumber: true, phase: true },
      },
      parent: {
        select: { id: true, name: true, projectNumber: true },
      },
    },
  });

  if (!project) return null;

  return {
    id: project.id,
    projectNumber: project.projectNumber,
    name: project.name,
    category: project.category,
    phase: project.phase,
    state: project.state,
    client: project.client,
    address: project.address,
    description: project.description,
    area: project.area,
    estimatedCost: project.estimatedCost,
    startDate: project.startDate,
    endDate: project.endDate,
    services: project.services,
    buildingTypes: project.buildingTypes,
    deliveryMethods: project.deliveryMethods,
    projectType: project.projectType,
    level: project.level,
    lead: project.lead,
    leadName: project.lead ? `${project.lead.firstName} ${project.lead.lastName}` : null,
    managers: project.managers,
    managerNames: project.managers.map(m => `${m.employee.firstName} ${m.employee.lastName}`),
    coordinators: project.coordinators,
    coordinatorNames: project.coordinators.map(c => `${c.employee.firstName} ${c.employee.lastName}`),
    contacts: project.contactProjects.map(cp => ({
      fullName: `${cp.contact.lastName} ${cp.contact.firstName}`,
      phone: cp.contact.phone,
      email: cp.contact.email,
      role: cp.contact.role,
      roleInProject: cp.roleInProject,
      organization: cp.contact.organization?.name || 'עצמאי',
    })),
    events: project.events,
    children: project.children,
    parent: project.parent,
  };
}

export async function getProjectEvents(params: {
  projectId?: string;
  projectName?: string;
  eventType?: string;
  limit?: number;
}) {
  const where: any = {};

  if (params.projectId) {
    where.projectId = params.projectId;
  } else if (params.projectName) {
    where.project = {
      name: { contains: params.projectName, mode: 'insensitive' },
    };
  }

  if (params.eventType) {
    where.eventType = params.eventType;
  }

  const events = await prisma.projectEvent.findMany({
    where,
    include: {
      project: {
        select: { name: true, projectNumber: true },
      },
      files: {
        select: { fileName: true, fileType: true },
      },
    },
    orderBy: { eventDate: 'desc' },
    take: params.limit || 10,
  });

  return events.map(e => ({
    id: e.id,
    projectName: e.project.name,
    projectNumber: e.project.projectNumber,
    eventType: e.eventType,
    description: e.description,
    eventDate: e.eventDate,
    filesCount: e.files.length,
  }));
}

// ============ FIXED: Using ContactProject instead of ProjectContact ============
export async function getProjectContacts(params: {
  projectId?: string;
  projectName?: string;
}) {
  const where: any = {};

  if (params.projectId) {
    where.projectId = params.projectId;
  } else if (params.projectName) {
    where.project = {
      name: { contains: params.projectName, mode: 'insensitive' },
    };
  }

  const contactProjects = await prisma.contactProject.findMany({
    where,
    include: {
      contact: {
        include: {
          organization: { select: { name: true } },
        },
      },
      project: { select: { name: true, projectNumber: true } },
    },
  });

  return contactProjects.map(cp => ({
    id: cp.id,
    fullName: `${cp.contact.lastName} ${cp.contact.firstName}`,
    phone: cp.contact.phone,
    email: cp.contact.email,
    role: cp.contact.role,
    roleInProject: cp.roleInProject,
    organization: cp.contact.organization?.name || 'עצמאי',
    disciplines: cp.contact.disciplines,
    status: cp.status,
    projectName: cp.project.name,
    projectNumber: cp.project.projectNumber,
  }));
}

export async function countEmployees(params: {
  status?: string;
  groupBy?: string;
}) {
  const where: any = {};
  
  // **שימוש ב-normalizer**
  if (params.status && params.status !== 'all') {
    const normalizedStatus = normalizeEmployeeStatus(params.status);
    if (normalizedStatus && normalizedStatus !== 'all') {
      where.status = normalizedStatus;
    }
  }

  if (params.groupBy) {
    const groups = await prisma.employee.groupBy({
      by: [params.groupBy as any],
      where,
      _count: true,
    });
    return groups.map(g => ({
      [params.groupBy!]: (g as any)[params.groupBy!] || 'לא מוגדר',
      count: g._count,
    }));
  }

  const count = await prisma.employee.count({ where });
  return { total: count };
}

export async function countProjects(params: {
  state?: string;
  groupBy?: string;
}) {
  const where: any = {};
  
  // **שימוש ב-normalizer**
  if (params.state && params.state !== 'all') {
    const normalizedState = normalizeProjectState(params.state);
    if (normalizedState && normalizedState !== 'all') {
      where.state = normalizedState;
    }
  }

  if (params.groupBy) {
    const groups = await prisma.project.groupBy({
      by: [params.groupBy as any],
      where,
      _count: true,
    });
    return groups.map(g => ({
      [params.groupBy!]: (g as any)[params.groupBy!] || 'לא מוגדר',
      count: g._count,
    }));
  }

  const count = await prisma.project.count({ where });
  return { total: count };
}

export async function getUpcomingBirthdays(params: { days?: number }) {
  const days = params.days || 30;
  const today = new Date();
  
  const employees = await prisma.employee.findMany({
    where: {
      status: 'פעיל',
      birthDate: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
    },
  });

  const upcoming = employees
    .map(e => {
      if (!e.birthDate) return null;
      
      const bday = new Date(e.birthDate);
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }
      
      const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const age = thisYearBday.getFullYear() - bday.getFullYear();
      
      if (daysUntil <= days) {
        return {
          fullName: `${e.firstName} ${e.lastName}`,
          birthDate: e.birthDate,
          daysUntil,
          upcomingAge: age,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysUntil - b!.daysUntil);

  return upcoming;
}

export async function getChildrenBirthdays(params: { days?: number }) {
  const days = params.days || 30;
  const today = new Date();
  
  const employees = await prisma.employee.findMany({
    where: {
      status: 'פעיל',
      children: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      children: true,
    },
  });

  const upcoming: any[] = [];

  employees.forEach(emp => {
    if (!emp.children) return;
    
    let children: any[] = [];
    try {
      children = JSON.parse(emp.children);
    } catch (e) {
      return;
    }

    children.forEach((child: any) => {
      if (!child.birthDate) return;
      
      const bday = new Date(child.birthDate);
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }
      
      const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const age = thisYearBday.getFullYear() - bday.getFullYear();
      
      if (daysUntil <= days) {
        upcoming.push({
          childName: child.name,
          parentName: `${emp.firstName} ${emp.lastName}`,
          birthDate: child.birthDate,
          daysUntil,
          upcomingAge: age,
        });
      }
    });
  });

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

export async function searchAll(params: { query: string }) {
  const query = params.query;

  const [employees, projects, events] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { role: { contains: query, mode: 'insensitive' } },
          { department: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
      take: 10,
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { projectNumber: { contains: query, mode: 'insensitive' } },
          { client: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        phase: true,
        state: true,
      },
      take: 10,
    }),
    // NEW: Search in events (including emails)
    prisma.projectEvent.findMany({
      where: {
        description: { contains: query, mode: 'insensitive' },
      },
      include: {
        project: { select: { name: true, projectNumber: true } },
      },
      orderBy: { eventDate: 'desc' },
      take: 10,
    }),
  ]);

  return {
    employees: employees.map(e => ({
      ...e,
      fullName: `${e.firstName} ${e.lastName}`,
      type: 'employee',
    })),
    projects: projects.map(p => ({
      ...p,
      type: 'project',
    })),
    events: events.map(e => ({
      id: e.id,
      projectName: e.project.name,
      projectNumber: e.project.projectNumber,
      eventType: e.eventType,
      description: e.description.substring(0, 100) + (e.description.length > 100 ? '...' : ''),
      eventDate: e.eventDate,
      type: 'event',
    })),
  };
}

export async function getProjectsStats(params: {
  state?: string;
  category?: string;
}) {
  const where: any = {};
  if (params.state && params.state !== 'all') where.state = params.state;
  if (params.category) where.category = { contains: params.category, mode: 'insensitive' };

  const projects = await prisma.project.findMany({
    where,
    select: {
      estimatedCost: true,
      area: true,
      category: true,
      phase: true,
      state: true,
      lead: { select: { firstName: true, lastName: true } },
    },
  });

  const totalCost = projects.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  const totalArea = projects.reduce((sum, p) => sum + (p.area || 0), 0);
  const avgCost = projects.length > 0 ? totalCost / projects.length : 0;

  const byCategory: Record<string, { count: number; totalCost: number }> = {};
  projects.forEach(p => {
    const cat = p.category || 'לא מוגדר';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, totalCost: 0 };
    byCategory[cat].count++;
    byCategory[cat].totalCost += p.estimatedCost || 0;
  });

  const leads = Array.from(new Set(projects.filter(p => p.lead).map(p => `${p.lead!.firstName} ${p.lead!.lastName}`)));

  return {
    totalProjects: projects.length,
    totalEstimatedCost: totalCost,
    totalArea,
    averageCost: avgCost,
    byCategory,
    uniqueLeads: leads,
    leadsCount: leads.length,
  };
}

export async function getEmployeesStats(params: {
  status?: string;
}) {
  const where: any = {};
  if (params.status && params.status !== 'all') where.status = params.status;

  const employees = await prisma.employee.findMany({
    where,
    select: {
      birthDate: true,
      role: true,
      department: true,
      // grossSalary: removed (sensitive)
      employmentType: true,
      startDate: true,
    },
  });

  const today = new Date();
  const ages = employees
    .filter(e => e.birthDate)
    .map(e => {
      const birth = new Date(e.birthDate!);
      return today.getFullYear() - birth.getFullYear();
    });

  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
  const minAge = ages.length > 0 ? Math.min(...ages) : 0;
  const maxAge = ages.length > 0 ? Math.max(...ages) : 0;

  const byRole: Record<string, number> = {};
  employees.forEach(e => {
    const role = e.role || 'לא מוגדר';
    byRole[role] = (byRole[role] || 0) + 1;
  });

  const byDepartment: Record<string, number> = {};
  employees.forEach(e => {
    const dept = e.department || 'לא מוגדר';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
  });

  // const totalSalary = removed (sensitive calculation)

  return {
    totalEmployees: employees.length,
    averageAge: Math.round(avgAge * 10) / 10,
    minAge,
    maxAge,
    byRole,
    byDepartment,
    // totalMonthlySalary: removed (sensitive)
    // averageSalary: removed (sensitive)
  };
}

export async function getRecentEvents(params: {
  daysBack?: number;
  eventType?: string;
  limit?: number;
}) {
  const daysBack = params.daysBack || 7;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const where: any = {
    eventDate: { gte: since },
  };
  if (params.eventType) where.eventType = params.eventType;

  const events = await prisma.projectEvent.findMany({
    where,
    include: {
      project: { select: { name: true, projectNumber: true } },
    },
    orderBy: { eventDate: 'desc' },
    take: params.limit || 20,
  });

  return events.map(e => ({
    projectName: e.project.name,
    projectNumber: e.project.projectNumber,
    eventType: e.eventType,
    description: e.description,
    eventDate: e.eventDate,
  }));
}

export async function getProjectLeads() {
  const projects = await prisma.project.findMany({
    where: { leadId: { not: null } },
    select: {
      lead: {
        select: { id: true, firstName: true, lastName: true, role: true, department: true },
      },
    },
    distinct: ['leadId'],
  });

  return projects
    .filter(p => p.lead)
    .map(p => ({
      id: p.lead!.id,
      fullName: `${p.lead!.firstName} ${p.lead!.lastName}`,
      role: p.lead!.role,
      department: p.lead!.department,
    }));
}

// ============ CONTACTS FUNCTIONS ============

export async function getContacts(params: {
  status?: string;
  discipline?: string;
  contactType?: string;
  organizationName?: string;
}) {
  const where: any = {};
  
  // **שימוש ב-normalizer**
  if (params.status && params.status !== 'all') {
    const normalizedStatus = normalizeContactStatus(params.status);
    if (normalizedStatus && normalizedStatus !== 'all') {
      where.status = normalizedStatus;
    }
  }
  if (params.discipline) {
    where.disciplines = { has: params.discipline };
  }
  if (params.contactType) {
    where.contactTypes = { has: params.contactType };
  }
  if (params.organizationName) {
    where.organization = {
      name: { contains: params.organizationName, mode: 'insensitive' },
    };
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      organization: { select: { id: true, name: true, type: true } },
    },
    orderBy: { lastName: 'asc' },
  });

  return contacts.map(c => ({
    id: c.id,
    fullName: `${c.lastName} ${c.firstName}`,
    phone: c.phone,
    email: c.email,
    role: c.role,
    organization: c.organization?.name || 'עצמאי',
    disciplines: c.disciplines,
    contactTypes: c.contactTypes,
    status: c.status,
  }));
}

export async function getContactById(params: { searchTerm: string }) {
  const searchTerm = params.searchTerm.trim();
  const searchParts = searchTerm.split(/\s+/);
  
  const orConditions: any[] = [
    { phone: { contains: searchTerm } },
  ];
  
  if (searchParts.length === 1) {
    orConditions.push(
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } }
    );
  } else if (searchParts.length >= 2) {
    for (const part of searchParts) {
      orConditions.push(
        { firstName: { contains: part, mode: 'insensitive' } },
        { lastName: { contains: part, mode: 'insensitive' } }
      );
    }
    orConditions.push(
      { AND: [
        { firstName: { contains: searchParts[0], mode: 'insensitive' } },
        { lastName: { contains: searchParts[1], mode: 'insensitive' } }
      ]},
      { AND: [
        { firstName: { contains: searchParts[1], mode: 'insensitive' } },
        { lastName: { contains: searchParts[0], mode: 'insensitive' } }
      ]}
    );
  }
  
  const contact = await prisma.contact.findFirst({
    where: {
      OR: orConditions,
    },
    include: {
      organization: true,
      projects: {
        include: {
          project: {
            select: { id: true, name: true, projectNumber: true, state: true },
          },
        },
      },
    },
  });

  if (!contact) return null;

  return {
    id: contact.id,
    fullName: `${contact.lastName} ${contact.firstName}`,
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    email: contact.email,
    role: contact.role,
    birthDate: contact.birthDate,
    status: contact.status,
    contactTypes: contact.contactTypes,
    disciplines: contact.disciplines,
    notes: contact.notes,
    organization: contact.organization ? {
      id: contact.organization.id,
      name: contact.organization.name,
      type: contact.organization.type,
    } : null,
    projects: contact.projects.map(p => p.project),
  };
}

export async function getContactsByDiscipline(params: { discipline: string }) {
  const contacts = await prisma.contact.findMany({
    where: {
      disciplines: { has: params.discipline },
      status: 'פעיל',
    },
    include: {
      organization: { select: { name: true } },
    },
    orderBy: { lastName: 'asc' },
  });

  return contacts.map(c => ({
    fullName: `${c.lastName} ${c.firstName}`,
    phone: c.phone,
    email: c.email,
    role: c.role,
    organization: c.organization?.name || 'עצמאי',
  }));
}

export async function countContacts(params: {
  status?: string;
  groupBy?: string;
}) {
  const where: any = {};
  
  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }

  const count = await prisma.contact.count({ where });
  return { total: count };
}

export async function getOrganizations(params: {
  type?: string;
  isVendor?: boolean;
}) {
  const where: any = {};
  
  if (params.type) {
    where.type = params.type;
  }
  if (params.isVendor !== undefined) {
    where.isVendor = params.isVendor;
  }

  const orgs = await prisma.organization.findMany({
    where,
    include: {
      _count: { select: { contacts: true } },
    },
    orderBy: { name: 'asc' },
  });

  return orgs.map(o => ({
    id: o.id,
    name: o.name,
    type: o.type,
    phone: o.phone,
    email: o.email,
    contactsCount: o._count.contacts,
    isVendor: o.isVendor,
  }));
}

export async function getOrganizationById(params: { searchTerm: string }) {
  const searchTerm = params.searchTerm.trim();
  
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { businessId: { contains: searchTerm } },
      ],
    },
    include: {
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    type: org.type,
    businessId: org.businessId,
    phone: org.phone,
    email: org.email,
    address: org.address,
    website: org.website,
    isVendor: org.isVendor,
    notes: org.notes,
    contacts: org.contacts.map(c => ({
      id: c.id,
      fullName: `${c.lastName} ${c.firstName}`,
      phone: c.phone,
      role: c.role,
    })),
  };
}

// ============ NEW: SEARCH EVENTS FUNCTION ============

export async function searchEvents(params: {
  query: string;
  eventType?: string;
  projectName?: string;
  daysBack?: number;
  limit?: number;
}) {
  const where: any = {
    description: { contains: params.query, mode: 'insensitive' },
  };

  if (params.eventType) {
    where.eventType = params.eventType;
  }

  if (params.projectName) {
    where.project = {
      name: { contains: params.projectName, mode: 'insensitive' },
    };
  }

  if (params.daysBack) {
    const since = new Date();
    since.setDate(since.getDate() - params.daysBack);
    where.eventDate = { gte: since };
  }

  const events = await prisma.projectEvent.findMany({
    where,
    include: {
      project: { select: { name: true, projectNumber: true } },
      createdBy: { 
        select: { 
          name: true,
          employee: { select: { firstName: true, lastName: true } }
        } 
      },
    },
    orderBy: { eventDate: 'desc' },
    take: params.limit || 20,
  });

  return events.map(e => ({
    id: e.id,
    projectName: e.project.name,
    projectNumber: e.project.projectNumber,
    eventType: e.eventType,
    description: e.description,
    eventDate: e.eventDate,
    createdBy: e.createdBy?.employee 
      ? `${e.createdBy.employee.firstName} ${e.createdBy.employee.lastName}`
      : e.createdBy?.name || 'לא ידוע',
    createdAt: e.createdAt,
  }));
}
// ============ VENDOR RATING FUNCTIONS ============

export async function getVendorRatings(params: {
  organizationName?: string;
  contactName?: string;
  projectName?: string;
  minRating?: number;
}) {
  const where: any = {};

  if (params.projectName) {
    where.project = {
      name: { contains: params.projectName, mode: 'insensitive' },
    };
  }

  if (params.minRating) {
    where.avgRating = { gte: params.minRating };
  }

  if (params.organizationName) {
    where.contact = {
      organization: {
        name: { contains: params.organizationName, mode: 'insensitive' },
      },
    };
  }

  if (params.contactName) {
    const contactParts = params.contactName.split(/\s+/);
    where.contact = {
      ...where.contact,
      OR: contactParts.flatMap(part => [
        { firstName: { contains: part, mode: 'insensitive' } },
        { lastName: { contains: part, mode: 'insensitive' } },
      ]),
    };
  }

  const reviews = await prisma.individualReview.findMany({
    where,
    include: {
      contact: { 
        select: { 
          firstName: true, 
          lastName: true,
          organization: { select: { name: true } },
        } 
      },
      project: { select: { name: true, projectNumber: true } },
      reviewer: {
        select: {
          name: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { avgRating: 'desc' },
    take: 20,
  });

  return reviews.map(r => ({
    contactName: `${r.contact.firstName} ${r.contact.lastName}`,
    organizationName: r.contact.organization?.name || 'עצמאי',
    avgRating: r.avgRating,
    projectName: r.project?.name || (r as any).externalProjectName || 'פרויקט חיצוני',
    projectNumber: r.project?.projectNumber || 'חיצוני',
    reviewerName: r.reviewer?.employee
      ? `${r.reviewer.employee.firstName} ${r.reviewer.employee.lastName}`
      : r.reviewer?.name || 'לא ידוע',
    reviewDate: r.createdAt,
  }));
}

export async function getTopRatedVendors(params: {
  discipline?: string;
  limit?: number;
}) {
  const limit = params.limit || 10;

  // ארגונים מדורגים
  const orgWhere: any = {
    reviewCount: { gt: 0 },
  };

  const organizations = await prisma.organization.findMany({
    where: orgWhere,
    select: {
      id: true,
      name: true,
      averageRating: true,
      reviewCount: true,
      contacts: {
        select: { disciplines: true },
        take: 1,
      },
    },
    orderBy: { averageRating: 'desc' },
    take: limit,
  });

  // אנשי קשר מדורגים
  const contactWhere: any = {
    reviewCount: { gt: 0 },
  };

  if (params.discipline) {
    contactWhere.disciplines = { has: params.discipline };
  }

  const contacts = await prisma.contact.findMany({
    where: contactWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      averageRating: true,
      reviewCount: true,
      disciplines: true,
      organization: { select: { name: true } },
    },
    orderBy: { averageRating: 'desc' },
    take: limit,
  });

  return {
    topOrganizations: organizations.map(o => ({
      name: o.name,
      avgRating: o.averageRating,
      reviewCount: o.reviewCount,
    })),
    topContacts: contacts.map(c => ({
      name: `${c.firstName} ${c.lastName}`,
      avgRating: c.averageRating,
      reviewCount: c.reviewCount,
      disciplines: c.disciplines,
      organization: c.organization?.name || 'עצמאי',
    })),
  };
}

export async function getVendorRatingStats() {
  const [orgCount, contactCount, individualReviewCount] = await Promise.all([
    prisma.organization.count({ where: { reviewCount: { gt: 0 } } }),
    prisma.contact.count({ where: { reviewCount: { gt: 0 } } }),
    prisma.individualReview.count(),
  ]);

  const orgsWithRatings = await prisma.organization.findMany({
    where: { reviewCount: { gt: 0 } },
    select: { averageRating: true },
  });

  const contactsWithRatings = await prisma.contact.findMany({
    where: { reviewCount: { gt: 0 } },
    select: { averageRating: true, disciplines: true },
  });

  const avgOrgRating = orgsWithRatings.length > 0
    ? orgsWithRatings.reduce((sum, o) => sum + (o.averageRating || 0), 0) / orgsWithRatings.length
    : 0;

  const avgContactRating = contactsWithRatings.length > 0
    ? contactsWithRatings.reduce((sum, c) => sum + (c.averageRating || 0), 0) / contactsWithRatings.length
    : 0;

  // פילוח לפי דיסציפלינה
  const byDiscipline: Record<string, { count: number; totalRating: number }> = {};
  contactsWithRatings.forEach(c => {
    c.disciplines.forEach(d => {
      if (!byDiscipline[d]) byDiscipline[d] = { count: 0, totalRating: 0 };
      byDiscipline[d].count++;
      byDiscipline[d].totalRating += c.averageRating || 0;
    });
  });

  const disciplineStats = Object.entries(byDiscipline).map(([discipline, data]) => ({
    discipline,
    count: data.count,
    avgRating: data.totalRating / data.count,
  })).sort((a, b) => b.avgRating - a.avgRating);

  return {
    summary: {
      ratedOrganizations: orgCount,
      ratedContacts: contactCount,
      totalIndividualReviews: individualReviewCount,
      avgOrganizationRating: Math.round(avgOrgRating * 100) / 100,
      avgContactRating: Math.round(avgContactRating * 100) / 100,
    },
    byDiscipline: disciplineStats,
  };
}

// ================================================
// File Content Search - חיפוש בתוכן קבצים מצורפים
// ================================================

export async function searchFileContents(params: {
  query: string;
  projectId?: string;
  projectName?: string;
  eventType?: string;
  limit?: number;
}) {
  const where: any = {
    extractedText: {
      not: null,
      contains: params.query,
      mode: 'insensitive',
    },
  };

  // Filter by project if specified
  if (params.projectId || params.projectName) {
    where.event = {
      project: params.projectId 
        ? { id: params.projectId }
        : { name: { contains: params.projectName, mode: 'insensitive' } },
    };
  }

  // Filter by event type if specified
  if (params.eventType) {
    where.event = {
      ...where.event,
      eventType: params.eventType,
    };
  }

  const files = await prisma.eventFile.findMany({
    where,
    include: {
      event: {
        include: {
          project: {
            select: { id: true, name: true, projectNumber: true }
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit || 10,
  });

  return files.map(f => ({
    fileId: f.id,
    fileName: f.fileName,
    fileType: f.fileType,
    eventId: f.event.id,
    eventType: f.event.eventType,
    eventDate: f.event.eventDate,
    eventDescription: f.event.description,
    projectId: f.event.project.id,
    projectName: f.event.project.name,
    projectNumber: f.event.project.projectNumber,
    // Return relevant excerpt from extracted text
    textExcerpt: getTextExcerpt(f.extractedText || '', params.query, 500),
    fullText: f.extractedText,
  }));
}

/**
 * Get excerpt from text around the search query
 */
function getTextExcerpt(text: string, query: string, maxLength: number): string {
  if (!text || !query) return text.substring(0, maxLength);
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    return text.substring(0, maxLength);
  }
  
  // Get context around the match
  const start = Math.max(0, index - 200);
  const end = Math.min(text.length, index + query.length + 300);
  
  let excerpt = text.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  
  return excerpt;
}

/**
 * Get summary of file for Agent to read
 */
export async function getFileSummary(params: { fileId: string }) {
  const file = await prisma.eventFile.findUnique({
    where: { id: params.fileId },
    include: {
      event: {
        include: {
          project: {
            select: { id: true, name: true, projectNumber: true }
          },
        },
      },
    },
  });

  if (!file) {
    return { error: 'קובץ לא נמצא' };
  }

  return {
    fileName: file.fileName,
    fileType: file.fileType,
    eventType: file.event.eventType,
    eventDate: file.event.eventDate,
    eventDescription: file.event.description,
    projectName: file.event.project.name,
    projectNumber: file.event.project.projectNumber,
    hasExtractedText: !!file.extractedText,
    extractedText: file.extractedText || 'לא נמצא טקסט בקובץ זה',
    textLength: file.extractedText?.length || 0,
  };
}

// ============ EDUCATION & CERTIFICATIONS ============

/**
 * מחזיר רשימת עובדים עם פרטי השכלה והכשרות
 * מאפשר סינון לפי סוג תואר, מוסד, או הכשרה
 */
export async function getEmployeesWithEducation(params: {
  degreeType?: string;      // סוג תואר: מהנדס, הנדסאי, תואר ראשון, תואר שני, MBA
  institution?: string;     // מוסד לימודים
  certification?: string;   // הכשרה/תעודה
  status?: string;          // סטטוס עובד
}) {
  const where: any = { status: 'פעיל' };
  
  // סינון לפי סטטוס
  if (params.status) {
    const normalizedStatus = normalizeEmployeeStatus(params.status);
    if (normalizedStatus && normalizedStatus !== 'all') {
      where.status = normalizedStatus;
    }
  }
  
  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      department: true,
      education: true,
      certifications: true,
    },
    orderBy: { lastName: 'asc' },
  });
  
  // עיבוד התוצאות
  const results: any[] = [];
  
  for (const emp of employees) {
    let education: any[] = [];
    let certifications: any[] = [];
    
    // פרסור JSON
    if (emp.education) {
      try { education = JSON.parse(emp.education); } catch { education = []; }
    }
    if (emp.certifications) {
      try { certifications = JSON.parse(emp.certifications); } catch { certifications = []; }
    }
    
    // סינון לפי סוג תואר
    if (params.degreeType) {
      const searchTerm = params.degreeType.toLowerCase();
      const hasMatch = education.some((edu: any) => {
        const degree = (edu.degree || edu.type || '').toLowerCase();
        const field = (edu.field || edu.major || '').toLowerCase();
        return degree.includes(searchTerm) || 
               field.includes(searchTerm) ||
               degree.includes('מהנדס') && searchTerm.includes('מהנדס') ||
               degree.includes('הנדסאי') && searchTerm.includes('הנדסאי') ||
               degree.includes('b.sc') && searchTerm.includes('תואר ראשון') ||
               degree.includes('m.sc') && searchTerm.includes('תואר שני') ||
               degree.includes('mba') && searchTerm.includes('mba');
      });
      if (!hasMatch) continue;
    }
    
    // סינון לפי מוסד
    if (params.institution) {
      const searchTerm = params.institution.toLowerCase();
      const hasMatch = education.some((edu: any) => {
        const inst = (edu.institution || edu.school || '').toLowerCase();
        return inst.includes(searchTerm);
      });
      if (!hasMatch) continue;
    }
    
    // סינון לפי הכשרה
    if (params.certification) {
      const searchTerm = params.certification.toLowerCase();
      const hasMatch = certifications.some((cert: any) => {
        const name = (cert.name || cert.title || '').toLowerCase();
        return name.includes(searchTerm);
      });
      if (!hasMatch) continue;
    }
    
    results.push({
      fullName: `${emp.firstName} ${emp.lastName}`,
      role: emp.role,
      department: emp.department,
      education: education.map((edu: any) => ({
        degree: edu.degree || edu.type,
        field: edu.field || edu.major,
        institution: edu.institution || edu.school,
        year: edu.year || edu.graduationYear,
      })),
      certifications: certifications.map((cert: any) => ({
        name: cert.name || cert.title,
        issuer: cert.issuer || cert.organization,
        year: cert.year,
      })),
    });
  }
  
  return {
    total: results.length,
    employees: results,
  };
}


// ============ STAGE 6.3: EQUIPMENT FUNCTIONS ============
// S6-GAP-002: Equipment module was not covered

export async function getEquipment(params: {
  status?: string;
  type?: string;
  manufacturer?: string;
  isOffice?: boolean;
}) {
  const where: any = {};

  if (params.status && params.status !== 'all') {
    where.status = params.status.toUpperCase();
  }
  if (params.type) {
    where.type = { contains: params.type, mode: 'insensitive' };
  }
  if (params.manufacturer) {
    where.manufacturer = { contains: params.manufacturer, mode: 'insensitive' };
  }
  if (params.isOffice !== undefined) {
    where.isOfficeEquipment = params.isOffice;
  }

  const equipment = await prisma.equipment.findMany({
    where,
    include: {
      currentAssignee: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return equipment.map((eq) => ({
    id: eq.id,
    type: eq.type,
    manufacturer: eq.manufacturer,
    model: eq.model,
    serialNumber: eq.serialNumber,
    status: eq.status,
    isOfficeEquipment: eq.isOfficeEquipment,
    purchaseDate: eq.purchaseDate,
    warrantyExpiry: eq.warrantyExpiry,
    location: eq.location,
    assignedTo: eq.currentAssignee
      ? `${eq.currentAssignee.firstName} ${eq.currentAssignee.lastName}`
      : null,
    notes: eq.notes,
  }));
}

export async function getEquipmentById(params: { id: string }) {
  const equipment = await prisma.equipment.findUnique({
    where: { id: params.id },
    include: {
      currentAssignee: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!equipment) return null;

  return {
    id: equipment.id,
    type: equipment.type,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    serialNumber: equipment.serialNumber,
    status: equipment.status,
    isOfficeEquipment: equipment.isOfficeEquipment,
    purchaseDate: equipment.purchaseDate,
    warrantyExpiry: equipment.warrantyExpiry,
    location: equipment.location,
    assignedTo: equipment.currentAssignee
      ? `${equipment.currentAssignee.firstName} ${equipment.currentAssignee.lastName}`
      : null,
    notes: equipment.notes,
  };
}

export async function countEquipment(params: { status?: string; type?: string }) {
  const where: any = {};

  if (params.status && params.status !== 'all') {
    where.status = params.status.toUpperCase();
  }
  if (params.type) {
    where.type = { contains: params.type, mode: 'insensitive' };
  }

  const count = await prisma.equipment.count({ where });
  return { count };
}

export async function getEquipmentStats() {
  const [total, byStatus, byType, expiringSoon] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.equipment.groupBy({
      by: ['type'],
      _count: { _all: true },
    }),
    prisma.equipment.count({
      where: {
        warrantyExpiry: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          gte: new Date(),
        },
      },
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count._all])),
    warrantyExpiringSoon: expiringSoon,
  };
}

// ============ STAGE 6.3: USERS FUNCTIONS (ADMIN ONLY) ============
// S6-GAP-001: Users module was not covered
// NOTE: These functions should ONLY be called when userRole is ADMIN

export async function getUsers(params: { role?: string }) {
  const where: any = {};

  if (params.role) {
    where.roles = { some: { role: { name: params.role } } };
  }

  const users = await prisma.user.findMany({
    where,
    include: { roles: { include: { role: true } } },
    orderBy: { email: 'asc' },
    take: 50,
  });

  // Return only non-sensitive fields
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.roles[0]?.role?.name,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    isActive: user.isActive,
  }));
}

export async function getUserById(params: { id: string }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { roles: { include: { role: true } } },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.roles[0]?.role?.name,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    isActive: user.isActive,
  };
}

export async function countUsers(params: { role?: string }) {
  const where: any = {};

  if (params.role) {
    where.roles = { some: { role: { name: params.role } } };
  }

  const count = await prisma.user.count({ where });
  return { count };
}

// ============ STAGE 6.3 R4: ACTIVITY LOG FUNCTIONS ============
// These functions wrap the activity.ts exports for Agent use
// Access control: ADMIN can see all, MANAGER can see module logs (not security)

export async function getActivityLogs(params: {
  userEmail?: string;
  action?: string;
  category?: string;
  module?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ActivityLogEntry[]> {
  return queryActivityLogs({
    userEmail: params.userEmail,
    action: params.action,
    category: params.category,
    module: params.module,
    targetType: params.targetType,
    targetId: params.targetId,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    limit: params.limit || 20,
  });
}

export async function getActivityStats(params: {
  startDate?: string;
  endDate?: string;
}) {
  return getActivityLogStats({
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
  });
}

export async function getEntityHistory(params: {
  targetType: string;
  targetId: string;
  limit?: number;
}): Promise<ActivityLogEntry[]> {
  return getEntityTimeline(params.targetType, params.targetId, params.limit);
}

export async function getUserActivity(params: {
  userEmail: string;
  startDate?: string;
  endDate?: string;
}) {
  return getUserActivitySummary(
    params.userEmail,
    params.startDate ? new Date(params.startDate) : undefined,
    params.endDate ? new Date(params.endDate) : undefined
  );
}

export async function getSecurityAudit(params: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ActivityLogEntry[]> {
  return getSecurityEvents(
    params.startDate ? new Date(params.startDate) : undefined,
    params.endDate ? new Date(params.endDate) : undefined,
    params.limit
  );
}

// מיפוי שמות פונקציות לפונקציות בפועל
export const functionMap: Record<string, Function> = {
  getEmployees,
  getEmployeeById,
  getProjects,
  getProjectsByDomain,
  getProjectById,
  getProjectEvents,
  getProjectContacts,
  countEmployees,
  countProjects,
  getUpcomingBirthdays,
  getChildrenBirthdays,
  searchAll,
  getProjectsStats,
  getEmployeesStats,
  getRecentEvents,
  getProjectLeads,
  getContacts,
  getContactById,
  getContactsByDiscipline,
  countContacts,
  getOrganizations,
  getOrganizationById,
  searchEvents,
  getVendorRatings,
  getTopRatedVendors,
  getVendorRatingStats,
  // Vehicles - Basic
  getVehicles,
  getVehicleById,
  getVehicleByDriver,
  getVehicleFuelLogs,
  getVehicleServices,
  getVehicleAccidents,
  getVehicleTickets,
  countVehicles,
  getVehiclesStats,
  getVehiclesNeedingService,
  // Vehicles - Extended
  getVehicleDocuments,
  getVehiclesWithExpiringDocuments,
  // NOTE: Photo functions removed - Agent is for data queries, not file viewing
  getVehicleTollRoads,
  getTollRoadStats,
  getVehicleParkings,
  getParkingStats,
  getVehicleAssignments,
  // File Content Search (text extraction only, no URLs)
  searchFileContents,
  getFileSummary,
  // Data Dictionary
  getSchemaCatalog,
  getFieldInfo,
  findFieldBySynonym,
  // Education & Certifications
  getEmployeesWithEducation,
  // Stage 6.3: Equipment
  getEquipment,
  getEquipmentById,
  countEquipment,
  getEquipmentStats,
  // Stage 6.3: Users (ADMIN only)
  getUsers,
  getUserById,
  countUsers,
  // Stage 6.3 R4: Activity Log
  getActivityLogs,
  getActivityStats,
  getEntityHistory,
  getUserActivity,
  getSecurityAudit,
};
