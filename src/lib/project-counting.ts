// ================================================
// WDI ERP - Project/Building Counting
// Version: 20260129-COUNTING-FIX
// Single source of truth for project/building counts
// Based on projectNumber format per business rules
// ================================================

import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// ============ PATTERNS ============
// PROJECT: exactly 4 digits (e.g., 1293, 3414, 5324)
// ZONE: 4 digits + dash + letter (e.g., 3414-A, 3414-C)
// BUILDING: 4 digits + dash + 2-digit number (e.g., 5324-03)
// MEGA BUILDING: 4 digits + dash + letter + dash + 2-digit number (e.g., 3414-A-04)

const PROJECT_PATTERN = /^\d{4}$/
const ZONE_PATTERN = /^\d{4}-[A-Z]$/
const BUILDING_PATTERN = /^\d{4}-\d{2}$/
const MEGA_BUILDING_PATTERN = /^\d{4}-[A-Z]-\d{2}$/

/**
 * Check if a projectNumber represents a PROJECT (exactly 4 digits)
 */
export function isProjectNumber(projectNumber: string): boolean {
  return PROJECT_PATTERN.test(projectNumber)
}

/**
 * Check if a projectNumber represents a ZONE (4 digits + letter)
 * Zones are NOT counted in either total
 */
export function isZoneNumber(projectNumber: string): boolean {
  return ZONE_PATTERN.test(projectNumber)
}

/**
 * Check if a projectNumber represents a BUILDING
 * Either 4 digits + 2-digit number OR 4 digits + letter + 2-digit number
 */
export function isBuildingNumber(projectNumber: string): boolean {
  return BUILDING_PATTERN.test(projectNumber) || MEGA_BUILDING_PATTERN.test(projectNumber)
}

/**
 * Determine the type of a project entry based on its projectNumber
 */
export function getProjectType(projectNumber: string): 'project' | 'zone' | 'building' | 'unknown' {
  if (isProjectNumber(projectNumber)) return 'project'
  if (isZoneNumber(projectNumber)) return 'zone'
  if (isBuildingNumber(projectNumber)) return 'building'
  return 'unknown'
}

/**
 * Count projects and buildings according to business rules:
 * - Project count = entries with exactly 4-digit projectNumber
 * - Building count = leaf-level buildings (with number suffix) OR single-building projects (4 digits with no children)
 * - Zones are NEVER counted
 *
 * @param where Optional Prisma where clause for filtering (e.g., state filter)
 */
export async function getProjectAndBuildingCounts(
  where?: Prisma.ProjectWhereInput
): Promise<{ projectCount: number; buildingCount: number }> {
  // Fetch all projects with their children count
  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      projectNumber: true,
      _count: {
        select: { children: true }
      }
    }
  })

  let projectCount = 0
  let buildingCount = 0

  for (const p of projects) {
    const type = getProjectType(p.projectNumber)

    if (type === 'project') {
      // This is a 4-digit project
      projectCount++

      // If it has no children, it's also counted as a building (single-building project)
      if (p._count.children === 0) {
        buildingCount++
      }
    } else if (type === 'building') {
      // This is a building (has number suffix)
      buildingCount++
    }
    // Zones are not counted
  }

  return { projectCount, buildingCount }
}

/**
 * Get only the project count (4-digit entries)
 */
export async function getProjectCount(
  where?: Prisma.ProjectWhereInput
): Promise<number> {
  const projects = await prisma.project.findMany({
    where,
    select: { projectNumber: true }
  })

  return projects.filter(p => isProjectNumber(p.projectNumber)).length
}

/**
 * Get only the building count (entries with number suffix + single-building projects)
 */
export async function getBuildingCount(
  where?: Prisma.ProjectWhereInput
): Promise<number> {
  const { buildingCount } = await getProjectAndBuildingCounts(where)
  return buildingCount
}

/**
 * Count buildings for a specific project (by project number)
 * Returns count of direct and nested buildings
 */
export async function getBuildingCountForProject(
  projectNumber: string
): Promise<number> {
  // Find all entries that start with this project number
  const entries = await prisma.project.findMany({
    where: {
      projectNumber: { startsWith: projectNumber }
    },
    select: {
      projectNumber: true,
      _count: { select: { children: true } }
    }
  })

  let count = 0
  for (const entry of entries) {
    // Skip the parent project itself when counting buildings under it
    if (entry.projectNumber === projectNumber) {
      // If the project has no children, it counts as 1 building
      if (entry._count.children === 0) {
        count++
      }
      continue
    }

    // Count actual buildings
    if (isBuildingNumber(entry.projectNumber)) {
      count++
    }
  }

  return count
}

/**
 * Get project hierarchy summary for a specific project
 */
export async function getProjectHierarchySummary(
  projectNumber: string
): Promise<{
  projectNumber: string
  zoneCount: number
  buildingCount: number
  totalEntries: number
}> {
  const entries = await prisma.project.findMany({
    where: {
      projectNumber: { startsWith: projectNumber }
    },
    select: {
      projectNumber: true,
      _count: { select: { children: true } }
    }
  })

  let zoneCount = 0
  let buildingCount = 0

  for (const entry of entries) {
    if (entry.projectNumber === projectNumber) {
      // The parent project itself - if no children, counts as building
      if (entry._count.children === 0) {
        buildingCount++
      }
      continue
    }

    const type = getProjectType(entry.projectNumber)
    if (type === 'zone') zoneCount++
    if (type === 'building') buildingCount++
  }

  return {
    projectNumber,
    zoneCount,
    buildingCount,
    totalEntries: entries.length
  }
}
