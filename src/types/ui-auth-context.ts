// ================================================
// WDI ERP - UI Auth Context Type Definition
// Version: 20260125-RBAC-V1
// Shared type contract between backend and frontend
// ================================================

export type ModuleScope = 'ALL' | 'DOMAIN' | 'ASSIGNED'

export interface ProjectsModule {
  read: boolean
  create: boolean
  scope: ModuleScope
}

export interface HrModule {
  read: boolean
  create: boolean
  update: boolean
}

export interface VehiclesModule {
  read: boolean
  create: boolean
  scope: 'ALL'
}

export interface EquipmentModule {
  read: boolean
  create: boolean
  scope: 'ALL'
}

export interface AdminModule {
  enabled: boolean
}

export interface UIAuthContext {
  modules: {
    projects?: ProjectsModule
    hr?: HrModule
    vehicles?: VehiclesModule
    equipment?: EquipmentModule
    admin?: AdminModule
  }
}
