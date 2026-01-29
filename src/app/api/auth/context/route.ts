// ================================================
// WDI ERP - UI Auth Context Endpoint
// Version: 20260125-RBAC-V1
// Returns UI_AUTH_CONTEXT derived ONLY from evaluateAuthorization
// Single source of truth for frontend permissions
// ================================================

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  loadUserAuthContext,
  evaluateAuthorization,
  type Scope,
} from '@/lib/authorization'

// ================================================
// TYPE DEFINITIONS
// ================================================

type ModuleScope = 'ALL' | 'DOMAIN' | 'ASSIGNED'

interface ProjectsModule {
  read: boolean
  create: boolean
  scope: ModuleScope
}

interface HrModule {
  read: boolean
  create: boolean
  update: boolean
}

interface VehiclesModule {
  read: boolean
  create: boolean
  scope: 'ALL'
}

interface EquipmentModule {
  read: boolean
  create: boolean
  scope: 'ALL'
}

interface AdminModule {
  enabled: boolean
}

interface UIAuthContext {
  modules: {
    projects?: ProjectsModule
    hr?: HrModule
    vehicles?: VehiclesModule
    equipment?: EquipmentModule
    admin?: AdminModule
  }
}

// ================================================
// HELPER: Map Scope to Module Scope
// ================================================

function toModuleScope(scope: Scope | undefined): ModuleScope {
  if (scope === 'ALL') return 'ALL'
  if (scope === 'DOMAIN') return 'DOMAIN'
  if (scope === 'ASSIGNED') return 'ASSIGNED'
  // OWN, SELF, MAIN_PAGE map to ASSIGNED-level for UI purposes
  return 'ASSIGNED'
}

// ================================================
// ENDPOINT
// ================================================

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  const userId = (session.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }

  const ctx = await loadUserAuthContext(userId)
  if (!ctx) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 403 })
  }

  const uiAuthContext: UIAuthContext = { modules: {} }

  // ================================================
  // PROJECTS MODULE
  // ================================================
  const projectsRead = await evaluateAuthorization(ctx, { module: 'projects', operation: 'READ' })
  const projectsCreate = await evaluateAuthorization(ctx, { module: 'projects', operation: 'CREATE' })

  if (projectsRead.authorized || projectsCreate.authorized) {
    uiAuthContext.modules.projects = {
      read: projectsRead.authorized,
      create: projectsCreate.authorized,
      scope: toModuleScope(projectsRead.effectiveScope || projectsCreate.effectiveScope),
    }
  }

  // ================================================
  // HR MODULE
  // ================================================
  const hrRead = await evaluateAuthorization(ctx, { module: 'hr', operation: 'READ' })
  const hrCreate = await evaluateAuthorization(ctx, { module: 'hr', operation: 'CREATE' })
  const hrUpdate = await evaluateAuthorization(ctx, { module: 'hr', operation: 'UPDATE' })

  if (hrRead.authorized || hrCreate.authorized || hrUpdate.authorized) {
    uiAuthContext.modules.hr = {
      read: hrRead.authorized,
      create: hrCreate.authorized,
      update: hrUpdate.authorized,
    }
  }

  // ================================================
  // VEHICLES MODULE (ALL-scope only)
  // ================================================
  const vehiclesRead = await evaluateAuthorization(ctx, { module: 'vehicles', operation: 'READ' })
  const vehiclesCreate = await evaluateAuthorization(ctx, { module: 'vehicles', operation: 'CREATE' })

  // Only include if authorized with ALL scope
  if (
    (vehiclesRead.authorized && vehiclesRead.effectiveScope === 'ALL') ||
    (vehiclesCreate.authorized && vehiclesCreate.effectiveScope === 'ALL')
  ) {
    uiAuthContext.modules.vehicles = {
      read: vehiclesRead.authorized && vehiclesRead.effectiveScope === 'ALL',
      create: vehiclesCreate.authorized && vehiclesCreate.effectiveScope === 'ALL',
      scope: 'ALL',
    }
  }

  // ================================================
  // EQUIPMENT MODULE (ALL-scope only)
  // ================================================
  const equipmentRead = await evaluateAuthorization(ctx, { module: 'equipment', operation: 'READ' })
  const equipmentCreate = await evaluateAuthorization(ctx, { module: 'equipment', operation: 'CREATE' })

  // Only include if authorized with ALL scope
  if (
    (equipmentRead.authorized && equipmentRead.effectiveScope === 'ALL') ||
    (equipmentCreate.authorized && equipmentCreate.effectiveScope === 'ALL')
  ) {
    uiAuthContext.modules.equipment = {
      read: equipmentRead.authorized && equipmentRead.effectiveScope === 'ALL',
      create: equipmentCreate.authorized && equipmentCreate.effectiveScope === 'ALL',
      scope: 'ALL',
    }
  }

  // ================================================
  // ADMIN MODULE
  // ================================================
  const adminAccess = await evaluateAuthorization(ctx, { module: 'admin', operation: 'ADMIN' })

  if (adminAccess.authorized) {
    uiAuthContext.modules.admin = {
      enabled: true,
    }
  }

  return NextResponse.json(uiAuthContext)
}
