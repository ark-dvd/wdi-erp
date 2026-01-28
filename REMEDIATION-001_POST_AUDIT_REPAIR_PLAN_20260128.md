# REMEDIATION-001: Post-Audit System Repair Work Plan

---
Document ID: REMEDIATION-001
Document Title: Post-Audit System Repair Work Plan
Document Type: Engineering Work Plan
Status: **DRAFT - AWAITING APPROVAL**
Created: 2026-01-28
Last Updated: 2026-01-28
Author: Claude (Audit Agent)
Source Audits: AUDIT-001, AUDIT-001B
---

## 1. Executive Summary

### 1.1 Overview

Following the RBAC v2 implementation on the `stage1-auth-policy-alignment` branch, a comprehensive system audit was conducted. The audit identified **28 distinct issues** causing system-wide failures across multiple modules.

### 1.2 Issue Categorization

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 8 | System-breaking issues preventing core functionality |
| HIGH | 11 | Significant functionality loss or security gaps |
| MEDIUM | 9 | Inconsistencies, technical debt, documentation gaps |

### 1.3 Affected Systems

- **File Upload**: Completely broken for ALL users
- **Contacts Module**: Completely broken for ALL users
- **Organizations Module**: Completely broken for ALL users
- **Project Creation**: Employee dropdowns empty
- **Vehicle Management**: Employee assignment broken
- **Equipment Management**: Employee assignment broken
- **Events (Mobile)**: List not loading
- **Admin Panel**: No RBAC enforcement

### 1.4 Root Causes

1. **Missing RBAC modules** (files, contacts, organizations not in seed)
2. **Scope naming mismatch** (seed uses 'PROJECT', permissions.ts uses 'ASSIGNED')
3. **API response format changes** (MAYBACH pagination) not propagated to consumers
4. **Incomplete RBAC coverage** (many routes have no permission checks)

---

## 2. Issue Registry

### 2.1 CRITICAL Issues

#### REM-001-001: Missing 'files' Module in RBAC Seed
- **Description**: Upload API checks `requirePermission(session, 'files', 'create')` but 'files' module does not exist in seed.ts CANONICAL_MODULES
- **Affected Files**:
  - `src/app/api/upload/route.ts:21` (checks 'files' module)
  - `prisma/seed.ts:39-51` (missing 'files' in CANONICAL_MODULES)
- **Root Cause**: Module name used in API not added to seed during RBAC v2 implementation
- **Impact**: ALL file uploads fail for ALL users including Owner
- **Severity**: CRITICAL
- **Status**: PENDING

#### REM-001-002: Missing 'contacts' Module in RBAC Seed
- **Description**: Contacts API routes check `requirePermission(session, 'contacts', ...)` but 'contacts' module does not exist in seed.ts
- **Affected Files**:
  - `src/app/api/contacts/route.ts:109`
  - `src/app/api/contacts/[id]/route.ts:19,87,139`
  - `src/app/api/contacts/import/route.ts:32`
  - `src/app/api/admin/import-contacts/save/route.ts:19`
  - `prisma/seed.ts:39-51` (missing 'contacts')
- **Root Cause**: Module exists in DOC-013 but not added to seed
- **Impact**: ALL contact CRUD operations fail
- **Severity**: CRITICAL
- **Status**: PENDING

#### REM-001-003: Missing 'organizations' Module in RBAC Seed
- **Description**: Organizations API routes check `requirePermission(session, 'organizations', ...)` but module does not exist in seed.ts
- **Affected Files**:
  - `src/app/api/organizations/route.ts:105`
  - `src/app/api/organizations/[id]/route.ts:19,83,130`
  - `src/app/api/organizations/import/route.ts:31`
  - `prisma/seed.ts:39-51` (missing 'organizations')
- **Root Cause**: Module not added to seed
- **Impact**: ALL organization CRUD operations fail
- **Severity**: CRITICAL
- **Status**: PENDING

#### REM-001-004: 'PROJECT' Scope Not Handled in permissions.ts
- **Description**: Seed stores permissions with scope 'PROJECT' but permissions.ts checkScope() has no case for 'PROJECT' - only 'ASSIGNED'
- **Affected Files**:
  - `prisma/seed.ts:33` (defines type with 'PROJECT')
  - `prisma/seed.ts:87,97,102,109,112,115,117,148,151,154` (uses 'PROJECT' scope)
  - `src/lib/permissions.ts:114-122` (scopePrecedence missing 'PROJECT')
  - `src/lib/permissions.ts:148-186` (checkScope missing case 'PROJECT')
- **Root Cause**: Scope naming inconsistency between seed (PROJECT) and permissions.ts (ASSIGNED)
- **Impact**: project_manager, project_coordinator, administration, all_employees roles fail permission checks on PROJECT-scoped operations
- **Severity**: CRITICAL
- **Status**: PENDING

#### REM-001-005: Project Creation Employee Dropdown Empty (new)
- **Description**: Project creation page fetches employees but uses wrong response property
- **Affected Files**:
  - `src/app/dashboard/projects/new/page.tsx:186` - uses `data.employees || []`
  - `src/app/api/hr/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code expects `data.employees` but API returns `data.items`
- **Impact**: Cannot select project lead or team when creating project
- **Severity**: CRITICAL
- **Status**: PENDING

#### REM-001-006: Project Edit Employee Dropdown Empty
- **Description**: Project edit page fetches employees but uses wrong response property
- **Affected Files**:
  - `src/app/dashboard/projects/[id]/edit/page.tsx:115` - uses `data.employees || []`
  - `src/app/api/hr/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code expects `data.employees` but API returns `data.items`
- **Impact**: Cannot change project lead or team when editing project
- **Severity**: CRITICAL
- **Status**: PENDING

#### REM-001-007: Vehicle Page Employee Dropdown Empty
- **Description**: Vehicle detail page fetches employees expecting direct array
- **Affected Files**:
  - `src/app/dashboard/vehicles/[id]/page.tsx:81` - uses `data` directly and `data.filter()`
  - `src/app/api/hr/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code expects array but API returns paginated object
- **Impact**: Cannot assign/reassign drivers to vehicles
- **Severity**: CRITICAL
- **Status**: PENDING

#### REM-001-008: Vehicle New Page Employee Dropdown Empty
- **Description**: New vehicle page fetches employees expecting direct array
- **Affected Files**:
  - `src/app/dashboard/vehicles/new/page.tsx:33` - uses `data.filter()`
  - `src/app/api/hr/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code expects array but API returns paginated object
- **Impact**: Cannot assign driver when creating new vehicle
- **Severity**: CRITICAL
- **Status**: PENDING

---

### 2.2 HIGH Issues

#### REM-001-009: Equipment New Page Employee Dropdown Empty
- **Description**: New equipment page fetches employees expecting direct array
- **Affected Files**:
  - `src/app/dashboard/equipment/new/page.tsx:45` - uses response directly
  - `src/app/api/hr/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code expects array but API returns paginated object
- **Impact**: Cannot assign equipment to employee when creating
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-010: Equipment Edit Page Employee Dropdown Empty
- **Description**: Equipment edit page fetches employees expecting direct array
- **Affected Files**:
  - `src/app/dashboard/equipment/[id]/edit/page.tsx:82` - uses response directly
  - `src/app/api/hr/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code expects array but API returns paginated object
- **Impact**: Cannot reassign equipment to different employee
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-011: Mobile Events Page List Empty
- **Description**: Mobile events page uses wrong response property
- **Affected Files**:
  - `src/app/m/events/page.tsx:70` - uses `data.events || []`
  - `src/app/api/events/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code expects `data.events` but API returns `data.items`
- **Impact**: Mobile events page shows empty list
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-012: Events New Page Projects Dropdown May Be Empty
- **Description**: Events new page may not handle paginated projects response
- **Affected Files**:
  - `src/app/dashboard/events/new/page.tsx:41-44` - uses response directly
  - `src/app/api/projects/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Need to verify if handling paginated response correctly
- **Impact**: May not be able to select project when creating event
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-013: Mobile Vehicles Page List Empty
- **Description**: Mobile vehicles page expects direct array
- **Affected Files**:
  - `src/app/m/vehicles/page.tsx:28` - uses `Array.isArray(data) ? data : []`
  - `src/app/api/vehicles/route.ts` - returns `{items: [...], pagination: {...}}`
- **Root Cause**: Code only handles array, not paginated object
- **Impact**: Mobile vehicles page shows empty list
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-014: Events List API Has No RBAC
- **Description**: Events list endpoint (/api/events GET) has no permission checks
- **Affected Files**:
  - `src/app/api/events/route.ts:21-153` - only auth check, no RBAC
- **Root Cause**: RBAC not implemented during migration
- **Impact**: All authenticated users can see all events regardless of role
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-015: Individual Reviews Has No RBAC
- **Description**: Individual reviews endpoints have no permission checks
- **Affected Files**:
  - `src/app/api/individual-reviews/route.ts` - no RBAC
  - `src/app/api/individual-reviews/[id]/route.ts` - no RBAC
  - `src/app/api/contacts/[id]/reviews/route.ts` - no RBAC
- **Root Cause**: RBAC not implemented
- **Impact**: All authenticated users can see/create/edit all vendor reviews
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-016: Admin Users API Has No RBAC
- **Description**: Admin users endpoints have no permission checks
- **Affected Files**:
  - `src/app/api/admin/users/route.ts` - no RBAC for GET
- **Root Cause**: RBAC not implemented
- **Impact**: All authenticated users can list all users
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-017: Admin Roles API Has No RBAC
- **Description**: Admin roles endpoints have no permission checks
- **Affected Files**:
  - `src/app/api/admin/roles/route.ts` - no RBAC for GET
  - `src/app/api/admin/roles/[name]/route.ts` - no RBAC for GET
- **Root Cause**: RBAC not implemented
- **Impact**: All authenticated users can view all roles and their permissions
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-018: Admin Logs API Has No RBAC
- **Description**: Admin logs endpoint has no permission checks
- **Affected Files**:
  - `src/app/api/admin/logs/route.ts` - no RBAC
- **Root Cause**: RBAC not implemented
- **Impact**: All authenticated users can view all activity logs
- **Severity**: HIGH
- **Status**: PENDING

#### REM-001-019: Admin Duplicates API Has No RBAC
- **Description**: Admin duplicates endpoints have no permission checks
- **Affected Files**:
  - `src/app/api/admin/duplicates/route.ts` - no RBAC
  - `src/app/api/admin/duplicates/[id]/route.ts` - no RBAC
  - `src/app/api/admin/duplicates/[id]/merge/route.ts` - no RBAC
  - `src/app/api/admin/duplicates/[id]/undo/route.ts` - no RBAC
  - `src/app/api/admin/duplicates/scan/route.ts` - no RBAC
- **Root Cause**: RBAC not implemented
- **Impact**: All authenticated users can view/manage duplicate records
- **Severity**: HIGH
- **Status**: PENDING

---

### 2.3 MEDIUM Issues

#### REM-001-020: Two Authorization Systems in Parallel
- **Description**: System has both RBAC v1 (authorization.ts) and RBAC v2 (permissions.ts) running in parallel
- **Affected Files**:
  - `src/lib/authorization.ts` - v1 system
  - `src/lib/permissions.ts` - v2 system
  - `src/app/api/vehicles/route.ts` - uses v1
  - `src/app/api/equipment/route.ts` - uses v1
  - Most other routes - use v2
- **Root Cause**: Incomplete migration from v1 to v2
- **Impact**: Inconsistent authorization behavior, maintenance burden
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-021: Seed Has 'org_directory' Module Not In DOC-013
- **Description**: Seed defines 'org_directory' module but DOC-013 says it was merged into 'hr'
- **Affected Files**:
  - `prisma/seed.ts:40` - defines org_directory
  - `DOC-013:§12.3` - says merged into hr
- **Root Cause**: Seed not aligned with canonical documentation
- **Impact**: Confusion, potential permission grants to non-existent module
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-022: Seed Has 'documents' Module Not In DOC-013
- **Description**: Seed defines 'documents' module but DOC-013 says no separate documents module
- **Affected Files**:
  - `prisma/seed.ts:47` - defines documents
  - `DOC-013:M-005` - "There is no separate 'Documents' module"
- **Root Cause**: Seed not aligned with canonical documentation
- **Impact**: Confusion, potential permission grants to non-existent module
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-023: Seed Missing 'financial' Module From DOC-013
- **Description**: DOC-013 §6.1 lists 'financial' module (placeholder) but seed doesn't include it
- **Affected Files**:
  - `prisma/seed.ts` - missing financial
  - `DOC-013:§6.1` - lists financial as placeholder
- **Root Cause**: Incomplete seed alignment with DOC-013
- **Impact**: Future financial module implementation will need seed update
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-024: Mobile Events New Page May Have Issues
- **Description**: Mobile events new page fetches projects - need to verify format handling
- **Affected Files**:
  - `src/app/m/events/new/page.tsx:39` - fetches /api/projects
- **Root Cause**: Unclear if handles paginated response
- **Impact**: Mobile event creation may fail
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-025: Mobile Events Page Projects Fetch
- **Description**: Mobile events page fetches projects - need to verify format handling
- **Affected Files**:
  - `src/app/m/events/page.tsx:58` - fetches /api/projects
- **Root Cause**: Unclear if handles paginated response
- **Impact**: Project filter dropdown may be empty
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-026: Admin Roles Response Format
- **Description**: Admin pages expect `data.roles` - need to verify API returns this format
- **Affected Files**:
  - `src/app/dashboard/admin/users/page.tsx:113` - uses `data.roles || []`
  - `src/app/dashboard/admin/users/[id]/page.tsx:170` - uses `data.roles || []`
  - `src/app/dashboard/admin/roles/page.tsx:77` - uses `data.roles || []`
  - `src/app/api/admin/roles/route.ts` - returns ?
- **Root Cause**: Need to verify API response format matches expectation
- **Impact**: Admin roles may not display correctly
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-027: Activity API Has No RBAC
- **Description**: Activity endpoint has no permission checks
- **Affected Files**:
  - `src/app/api/activity/route.ts` - no RBAC
- **Root Cause**: RBAC not implemented
- **Impact**: May expose activity data inappropriately
- **Severity**: MEDIUM
- **Status**: PENDING

#### REM-001-028: File Proxy API Has No RBAC
- **Description**: File proxy endpoint has no permission checks
- **Affected Files**:
  - `src/app/api/file/route.ts` - no RBAC
- **Root Cause**: RBAC not implemented
- **Impact**: Files accessible without permission check (relies on URL secrecy)
- **Severity**: MEDIUM
- **Status**: PENDING

---

## 3. Remediation Phases

### Phase 1: Critical RBAC Module Fixes

**Goal**: Restore core functionality by adding missing modules and fixing scope mismatch

#### Fix 1.1: Add Missing Modules to Seed (REM-001-001, REM-001-002, REM-001-003)

**Files to Modify**:
- `prisma/seed.ts`

**Exact Changes**:

1. Update CANONICAL_MODULES array at line 39:
```typescript
const CANONICAL_MODULES = [
  'org_directory',
  'hr',
  'projects',
  'events',
  'contacts',         // ADD - was missing
  'organizations',    // ADD - was missing
  'vendors',
  'vehicles',
  'equipment',
  'documents',
  'files',            // ADD - was missing
  'admin',
  'agent',
  'knowledge_repository',
] as const
```

2. Add permission grants for 'files' module (after line 156):
```typescript
// === files (uploads) ===
{ module: 'files', action: 'CREATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'pmo', 'finance_officer', 'domain_head', 'project_manager', 'project_coordinator', 'administration'] },
{ module: 'files', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'pmo', 'finance_officer', 'domain_head', 'project_manager', 'project_coordinator', 'administration', 'all_employees'] },
```

3. Add permission grants for 'contacts' module:
```typescript
// === contacts ===
{ module: 'contacts', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'pmo', 'finance_officer', 'domain_head', 'project_manager', 'project_coordinator', 'administration'] },
{ module: 'contacts', action: 'CREATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'pmo', 'domain_head', 'project_manager', 'project_coordinator', 'administration'] },
{ module: 'contacts', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'pmo', 'domain_head', 'project_manager', 'project_coordinator', 'administration'] },
{ module: 'contacts', action: 'DELETE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'administration'] },
```

4. Add permission grants for 'organizations' module:
```typescript
// === organizations (part of contacts per DOC-013) ===
{ module: 'organizations', action: 'READ', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'pmo', 'finance_officer', 'domain_head', 'project_manager', 'project_coordinator', 'administration'] },
{ module: 'organizations', action: 'CREATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'administration'] },
{ module: 'organizations', action: 'UPDATE', scope: 'ALL', roles: ['owner', 'executive', 'trust_officer', 'administration'] },
{ module: 'organizations', action: 'DELETE', scope: 'ALL', roles: ['owner', 'trust_officer'] },
```

**Verification Steps**:
1. Run `npx prisma db seed`
2. Verify permissions exist: Check database for new permissions
3. Test file upload as Owner - should succeed
4. Test contact creation as Owner - should succeed
5. Test organization creation as Owner - should succeed

---

#### Fix 1.2: Fix Scope Mismatch - Change seed 'PROJECT' to 'ASSIGNED' (REM-001-004)

**Files to Modify**:
- `prisma/seed.ts`

**Exact Changes**:

1. Update type definition at line 33:
```typescript
type Scope = 'ALL' | 'DOMAIN' | 'ASSIGNED' | 'OWN' | 'SELF'  // Changed PROJECT to ASSIGNED
```

2. Replace all occurrences of `scope: 'PROJECT'` with `scope: 'ASSIGNED'`:
- Line 87: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 97: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 102: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 109: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 112: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 115: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 117: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 148: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 151: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`
- Line 154: `scope: 'PROJECT'` → `scope: 'ASSIGNED'`

**Verification Steps**:
1. Run `npx prisma db seed`
2. Verify in database that permissions have scope 'ASSIGNED' not 'PROJECT'
3. Test as project_manager - should have access to assigned projects
4. Test as project_coordinator - should have access to assigned projects

---

### Phase 2: API Response Format Fixes

**Goal**: Fix all UI components to handle MAYBACH pagination format

#### Fix 2.1: Project Creation Employee Dropdown (REM-001-005)

**File to Modify**:
- `src/app/dashboard/projects/new/page.tsx`

**Exact Change** at line 186:
```typescript
// BEFORE:
setEmployees(Array.isArray(data) ? data : data.employees || [])

// AFTER:
setEmployees(data.items || (Array.isArray(data) ? data : []))
```

**Verification**: Create new project, verify employee dropdown populated

---

#### Fix 2.2: Project Edit Employee Dropdown (REM-001-006)

**File to Modify**:
- `src/app/dashboard/projects/[id]/edit/page.tsx`

**Exact Change** at line 115:
```typescript
// BEFORE:
setEmployees(Array.isArray(data) ? data : data.employees || [])

// AFTER:
setEmployees(data.items || (Array.isArray(data) ? data : []))
```

**Verification**: Edit existing project, verify employee dropdown populated

---

#### Fix 2.3: Vehicle Detail Employee Dropdown (REM-001-007)

**File to Modify**:
- `src/app/dashboard/vehicles/[id]/page.tsx`

**Exact Change** at line 81:
```typescript
// BEFORE:
fetch('/api/hr').then(r => r.json()).then(data => { setAllEmployees(data); setEmployees(data.filter((e: any) => e.status === 'פעיל')) }).catch(() => {})

// AFTER:
fetch('/api/hr').then(r => r.json()).then(data => {
  const items = data.items || (Array.isArray(data) ? data : [])
  setAllEmployees(items)
  setEmployees(items.filter((e: any) => e.status === 'פעיל'))
}).catch(() => {})
```

**Verification**: View vehicle detail, verify driver dropdown populated

---

#### Fix 2.4: Vehicle New Employee Dropdown (REM-001-008)

**File to Modify**:
- `src/app/dashboard/vehicles/new/page.tsx`

**Exact Change** at line 33:
```typescript
// BEFORE:
fetch('/api/hr').then(r => r.json()).then(data => setEmployees(data.filter((e: any) => e.status === 'פעיל'))).catch(() => {})

// AFTER:
fetch('/api/hr').then(r => r.json()).then(data => {
  const items = data.items || (Array.isArray(data) ? data : [])
  setEmployees(items.filter((e: any) => e.status === 'פעיל'))
}).catch(() => {})
```

**Verification**: Create new vehicle, verify driver dropdown populated

---

#### Fix 2.5: Equipment New Employee Dropdown (REM-001-009)

**File to Modify**:
- `src/app/dashboard/equipment/new/page.tsx`

**Exact Change** at line 45-47:
```typescript
// BEFORE:
fetch('/api/hr')
  .then(r => r.json())
  .then(setEmployees)

// AFTER:
fetch('/api/hr')
  .then(r => r.json())
  .then(data => setEmployees(data.items || (Array.isArray(data) ? data : [])))
```

**Verification**: Create new equipment, verify employee dropdown populated

---

#### Fix 2.6: Equipment Edit Employee Dropdown (REM-001-010)

**File to Modify**:
- `src/app/dashboard/equipment/[id]/edit/page.tsx`

**Exact Change** at line 82:
```typescript
// BEFORE:
fetch('/api/hr').then(r => r.json())

// AFTER:
fetch('/api/hr').then(r => r.json()).then(data => data.items || (Array.isArray(data) ? data : []))
```

Note: Need to verify exact usage in the Promise.all structure

**Verification**: Edit equipment, verify employee dropdown populated

---

#### Fix 2.7: Mobile Events List (REM-001-011)

**File to Modify**:
- `src/app/m/events/page.tsx`

**Exact Change** at line 70:
```typescript
// BEFORE:
setEvents(Array.isArray(data) ? data : data.events || [])

// AFTER:
setEvents(data.items || (Array.isArray(data) ? data : []))
```

**Verification**: Open mobile events page, verify events list populated

---

#### Fix 2.8: Events New Page Projects (REM-001-012)

**File to Modify**:
- `src/app/dashboard/events/new/page.tsx`

**Exact Change** at line 44:
```typescript
// BEFORE:
setProjects(data)

// AFTER:
setProjects(data.items || (Array.isArray(data) ? data : []))
```

**Verification**: Create new event, verify project dropdown populated

---

#### Fix 2.9: Mobile Vehicles List (REM-001-013)

**File to Modify**:
- `src/app/m/vehicles/page.tsx`

**Exact Change** at line 28:
```typescript
// BEFORE:
setVehicles(Array.isArray(data) ? data : [])

// AFTER:
setVehicles(data.items || (Array.isArray(data) ? data : []))
```

**Verification**: Open mobile vehicles page, verify vehicles list populated

---

### Phase 3: Missing RBAC Coverage

**Goal**: Add RBAC checks to all routes that currently lack them

#### Fix 3.1: Events List API RBAC (REM-001-014)

**File to Modify**:
- `src/app/api/events/route.ts`

**Exact Change**: Add after line 25 (after session check):
```typescript
// RBAC v2: Check read permission for events
const denied = await requirePermission(session, 'events', 'read')
if (denied) return denied
```

Also add import at top:
```typescript
import { requirePermission } from '@/lib/permissions'
```

**Verification**: Test as all_employees - should only see assigned project events

---

#### Fix 3.2: Individual Reviews RBAC (REM-001-015)

**Files to Modify**:
- `src/app/api/individual-reviews/route.ts`
- `src/app/api/individual-reviews/[id]/route.ts`
- `src/app/api/contacts/[id]/reviews/route.ts`

**Exact Changes**: Add RBAC checks using 'vendors' module (per DOC-013, vendor ratings)

```typescript
import { requirePermission } from '@/lib/permissions'

// In GET:
const denied = await requirePermission(session, 'vendors', 'read')
if (denied) return denied

// In POST:
const denied = await requirePermission(session, 'vendors', 'create')
if (denied) return denied

// In PUT:
const denied = await requirePermission(session, 'vendors', 'update')
if (denied) return denied

// In DELETE:
const denied = await requirePermission(session, 'vendors', 'delete')
if (denied) return denied
```

**Verification**: Test as different roles per DOC-014 vendor permissions

---

#### Fix 3.3: Admin APIs RBAC (REM-001-016, REM-001-017, REM-001-018, REM-001-019)

**Files to Modify**:
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/roles/route.ts`
- `src/app/api/admin/roles/[name]/route.ts`
- `src/app/api/admin/logs/route.ts`
- `src/app/api/admin/duplicates/route.ts`
- `src/app/api/admin/duplicates/[id]/route.ts`
- `src/app/api/admin/duplicates/[id]/merge/route.ts`
- `src/app/api/admin/duplicates/[id]/undo/route.ts`
- `src/app/api/admin/duplicates/scan/route.ts`

**Exact Changes**: Add RBAC checks using 'admin' module

```typescript
import { requirePermission } from '@/lib/permissions'

// In GET:
const denied = await requirePermission(session, 'admin', 'read')
if (denied) return denied

// In POST/PUT:
const denied = await requirePermission(session, 'admin', 'update')
if (denied) return denied
```

**Verification**: Only Owner, Executive, Trust Officer should access admin pages

---

### Phase 4: Documentation and Cleanup

**Goal**: Align documentation with implementation

#### Fix 4.1: Consolidate to Single Authorization System (REM-001-020)

**Decision Required**: Choose between:
- Option A: Migrate all routes to permissions.ts (RBAC v2)
- Option B: Keep both systems with clear boundaries

**Files Affected** (if Option A):
- `src/app/api/vehicles/route.ts` - change from evaluateAuthorization to requirePermission
- `src/app/api/equipment/route.ts` - change from evaluateAuthorization to requirePermission

**Verification**: Full regression test of vehicles and equipment modules

---

#### Fix 4.2: Remove org_directory from Seed (REM-001-021)

**File to Modify**:
- `prisma/seed.ts`

**Exact Change**: Remove 'org_directory' from CANONICAL_MODULES and all its permission grants

**Verification**: Verify no routes reference 'org_directory' module

---

#### Fix 4.3: Decide on documents Module (REM-001-022)

**Decision Required**: Either:
- Remove 'documents' from seed (align with DOC-013)
- Keep 'documents' and update DOC-013

**Files Affected**:
- `prisma/seed.ts`
- Potentially DOC-013

---

#### Fix 4.4: Update auth/context UI Types (Related to REM-001-004)

**Files to Modify**:
- `src/types/ui-auth-context.ts:7`
- `src/app/api/auth/context/route.ts:20,67-69`

**Exact Change**: Update to use 'ASSIGNED' instead of 'PROJECT' in UI scope types

---

## 4. Verification Checklist

### Phase 1 Verification

| Issue ID | Fix | Code Changed | Local Test | Staging | Production |
|----------|-----|--------------|------------|---------|------------|
| REM-001-001 | Add 'files' module | [ ] | [ ] | [ ] | [ ] |
| REM-001-002 | Add 'contacts' module | [ ] | [ ] | [ ] | [ ] |
| REM-001-003 | Add 'organizations' module | [ ] | [ ] | [ ] | [ ] |
| REM-001-004 | Change PROJECT→ASSIGNED | [ ] | [ ] | [ ] | [ ] |

### Phase 2 Verification

| Issue ID | Fix | Code Changed | Local Test | Staging | Production |
|----------|-----|--------------|------------|---------|------------|
| REM-001-005 | Project new employees | [ ] | [ ] | [ ] | [ ] |
| REM-001-006 | Project edit employees | [ ] | [ ] | [ ] | [ ] |
| REM-001-007 | Vehicle detail employees | [ ] | [ ] | [ ] | [ ] |
| REM-001-008 | Vehicle new employees | [ ] | [ ] | [ ] | [ ] |
| REM-001-009 | Equipment new employees | [ ] | [ ] | [ ] | [ ] |
| REM-001-010 | Equipment edit employees | [ ] | [ ] | [ ] | [ ] |
| REM-001-011 | Mobile events list | [ ] | [ ] | [ ] | [ ] |
| REM-001-012 | Events new projects | [ ] | [ ] | [ ] | [ ] |
| REM-001-013 | Mobile vehicles list | [ ] | [ ] | [ ] | [ ] |

### Phase 3 Verification

| Issue ID | Fix | Code Changed | Local Test | Staging | Production |
|----------|-----|--------------|------------|---------|------------|
| REM-001-014 | Events list RBAC | [ ] | [ ] | [ ] | [ ] |
| REM-001-015 | Individual reviews RBAC | [ ] | [ ] | [ ] | [ ] |
| REM-001-016 | Admin users RBAC | [ ] | [ ] | [ ] | [ ] |
| REM-001-017 | Admin roles RBAC | [ ] | [ ] | [ ] | [ ] |
| REM-001-018 | Admin logs RBAC | [ ] | [ ] | [ ] | [ ] |
| REM-001-019 | Admin duplicates RBAC | [ ] | [ ] | [ ] | [ ] |

### Phase 4 Verification

| Issue ID | Fix | Code Changed | Local Test | Staging | Production |
|----------|-----|--------------|------------|---------|------------|
| REM-001-020 | Consolidate auth | [ ] | [ ] | [ ] | [ ] |
| REM-001-021 | Remove org_directory | [ ] | [ ] | [ ] | [ ] |
| REM-001-022 | Decide documents | [ ] | [ ] | [ ] | [ ] |
| REM-001-023 | Add financial | [ ] | [ ] | [ ] | [ ] |
| REM-001-024 | Mobile events new | [ ] | [ ] | [ ] | [ ] |
| REM-001-025 | Mobile events projects | [ ] | [ ] | [ ] | [ ] |
| REM-001-026 | Admin roles format | [ ] | [ ] | [ ] | [ ] |
| REM-001-027 | Activity API RBAC | [ ] | [ ] | [ ] | [ ] |
| REM-001-028 | File proxy RBAC | [ ] | [ ] | [ ] | [ ] |

---

## 5. Rollback Plan

### 5.1 Seed Rollback

If seed changes cause issues:
1. Identify which permission changes caused the issue
2. Create migration to remove problematic permissions
3. Or restore previous seed and re-run

### 5.2 Code Rollback

If code changes cause regression:
1. Git revert the specific commit
2. Redeploy previous version
3. Document what went wrong for re-attempt

### 5.3 Emergency Procedures

If production is severely impacted:
1. **Immediate**: Disable RBAC checks temporarily (add bypass flag)
2. **Short-term**: Revert to pre-RBAC v2 branch
3. **Recovery**: Fix issues in isolated environment, then redeploy

---

## 6. Sign-off

### Phase 1 Sign-off

- [ ] All CRITICAL issues resolved
- [ ] File uploads working for Owner role
- [ ] Contacts CRUD working for Owner role
- [ ] Organizations CRUD working for Owner role
- [ ] PROJECT scope permissions working

**Sign-off**: _________________ Date: _________

### Phase 2 Sign-off

- [ ] All employee dropdowns populated
- [ ] All mobile pages loading data
- [ ] All list views showing data

**Sign-off**: _________________ Date: _________

### Phase 3 Sign-off

- [ ] All routes have appropriate RBAC
- [ ] Admin routes protected
- [ ] Vendor ratings protected

**Sign-off**: _________________ Date: _________

### Phase 4 Sign-off

- [ ] Single authorization system in use
- [ ] Seed aligned with DOC-013
- [ ] All technical debt addressed

**Sign-off**: _________________ Date: _________

### Final Sign-off

- [ ] All 28 issues resolved
- [ ] No regressions introduced
- [ ] Production verified stable

**Final Sign-off**: _________________ Date: _________

---

## Appendix A: Quick Reference - Issue to File Mapping

| Issue | Primary File |
|-------|-------------|
| REM-001-001 | prisma/seed.ts |
| REM-001-002 | prisma/seed.ts |
| REM-001-003 | prisma/seed.ts |
| REM-001-004 | prisma/seed.ts |
| REM-001-005 | src/app/dashboard/projects/new/page.tsx |
| REM-001-006 | src/app/dashboard/projects/[id]/edit/page.tsx |
| REM-001-007 | src/app/dashboard/vehicles/[id]/page.tsx |
| REM-001-008 | src/app/dashboard/vehicles/new/page.tsx |
| REM-001-009 | src/app/dashboard/equipment/new/page.tsx |
| REM-001-010 | src/app/dashboard/equipment/[id]/edit/page.tsx |
| REM-001-011 | src/app/m/events/page.tsx |
| REM-001-012 | src/app/dashboard/events/new/page.tsx |
| REM-001-013 | src/app/m/vehicles/page.tsx |
| REM-001-014 | src/app/api/events/route.ts |
| REM-001-015 | src/app/api/individual-reviews/*.ts |
| REM-001-016 | src/app/api/admin/users/route.ts |
| REM-001-017 | src/app/api/admin/roles/*.ts |
| REM-001-018 | src/app/api/admin/logs/route.ts |
| REM-001-019 | src/app/api/admin/duplicates/*.ts |
| REM-001-020 | src/lib/authorization.ts, src/lib/permissions.ts |
| REM-001-021 | prisma/seed.ts |
| REM-001-022 | prisma/seed.ts |
| REM-001-023 | prisma/seed.ts |
| REM-001-024 | src/app/m/events/new/page.tsx |
| REM-001-025 | src/app/m/events/page.tsx |
| REM-001-026 | src/app/api/admin/roles/route.ts |
| REM-001-027 | src/app/api/activity/route.ts |
| REM-001-028 | src/app/api/file/route.ts |

---

## Appendix B: Dependency Order

Some fixes depend on others:

1. **REM-001-001, 002, 003, 004** must be done FIRST (seed changes)
2. Then run `npx prisma db seed`
3. Then Phase 2 fixes can proceed (independent of each other)
4. Phase 3 fixes can proceed after Phase 1
5. Phase 4 can proceed last

---

**END OF DOCUMENT**
