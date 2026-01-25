# STAGE 5 — Phase 5.3b: Extended Remediation (Maybach Standard)

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Remediation Complete
**Branch:** stage1-auth-policy-alignment

---

## 1. Overview

This phase implements the "Maybach Standard" — 5 non-negotiable API contract requirements that were previously deferred in Phase 5.3:

| Requirement | Description | Status |
|-------------|-------------|--------|
| **R1** | Uniform Pagination | **IMPLEMENTED** |
| **R2** | Field-Level Validation Errors | **IMPLEMENTED** |
| **R3** | Filter Strictness (no silent ignore) | **IMPLEMENTED** |
| **R4** | Client-Configurable Sorting | **IMPLEMENTED** |
| **R5** | API Versioning | **IMPLEMENTED** |

---

## 2. Shared Utilities Created

### 2.1 New File: `src/lib/api-contracts.ts`

Central utility file implementing all Maybach requirements:

```typescript
// R1: Pagination
export function parsePagination(searchParams: URLSearchParams): PaginationParams
export function calculateSkip(page: number, limit: number): number
export function paginatedResponse<T>(items: T[], page: number, limit: number, total: number): PaginatedResponse<T>

// R2: Field-level Validation
export function validationError(errors: FieldError[] | Record<string, string>, generalMessage?: string): NextResponse
export function validateRequired(data: Record<string, any>, requiredFields: { field: string; label: string }[]): FieldError[]

// R3: Filter Validation
export function parseAndValidateFilters(searchParams: URLSearchParams, definitions: FilterDefinition[]): FilterValidationResult
export function filterValidationError(errors: FieldError[]): NextResponse

// R4: Sort Validation
export function parseAndValidateSort(searchParams: URLSearchParams, definition: SortDefinition): SortValidationResult
export function toPrismaOrderBy(sort: SortParams): Record<string, 'asc' | 'desc'>

// R5: Versioning
export function parseApiVersion(request: Request): string
export function versionedResponse<T>(data: T, options?: { status?: number; version?: string }): NextResponse<T>
```

### 2.2 Entity-Specific Definitions

```typescript
export const SORT_DEFINITIONS = {
  contacts: { allowedFields: ['firstName', 'lastName', 'email', ...], defaultField: 'lastName', defaultDirection: 'asc' },
  projects: { allowedFields: ['projectNumber', 'name', 'state', ...], defaultField: 'projectNumber', defaultDirection: 'asc' },
  employees: { allowedFields: ['firstName', 'lastName', 'role', ...], defaultField: 'lastName', defaultDirection: 'asc' },
  // ... all entities
}

export const FILTER_DEFINITIONS = {
  contacts: [{ name: 'search', type: 'string' }, { name: 'status', allowedValues: ['פעיל', 'לא פעיל'] }, ...],
  projects: [{ name: 'state', allowedValues: ['פעיל', 'הושלם', 'מושהה', 'מבוטל'] }, ...],
  // ... all entities
}
```

---

## 3. R1: Uniform Pagination

### 3.1 Response Format

All list endpoints now return:

```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3.2 Query Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | 1 | - | Page number (1-indexed) |
| `limit` | 20 | 100 | Items per page |

### 3.3 Endpoints Updated

| Endpoint | Previous | New |
|----------|----------|-----|
| `GET /api/contacts` | `[...]` | `{ items: [...], pagination: {...} }` |
| `GET /api/projects` | `[...]` | `{ items: [...], pagination: {...} }` |
| `GET /api/hr` | `[...]` | `{ items: [...], pagination: {...} }` |
| `GET /api/organizations` | `[...]` | `{ items: [...], pagination: {...} }` |
| `GET /api/vehicles` | `[...]` | `{ items: [...], pagination: {...} }` |
| `GET /api/equipment` | `[...]` | `{ items: [...], pagination: {...} }` |
| `GET /api/events` | `{ events: [...], pagination: {...} }` | `{ items: [...], pagination: {...} }` |
| `GET /api/individual-reviews` | `[...]` | `{ items: [...], pagination: {...} }` |
| `GET /api/admin/users` | `[...]` | `{ items: [...], pagination: {...} }` |

---

## 4. R2: Field-Level Validation Errors

### 4.1 Error Response Format

```json
{
  "error": "שגיאת אימות נתונים",
  "fields": {
    "firstName": "שם פרטי הוא שדה חובה",
    "phone": "טלפון הוא שדה חובה"
  }
}
```

### 4.2 Endpoints with Validation

| Endpoint | Required Fields |
|----------|-----------------|
| `POST /api/contacts` | firstName, lastName, phone |
| `POST /api/projects` | name |
| `POST /api/hr` | firstName, lastName, idNumber, role |
| `POST /api/organizations` | name |
| `POST /api/vehicles` | licensePlate, manufacturer, model |
| `POST /api/equipment` | type, manufacturer, model |
| `POST /api/individual-reviews` | contactId, projectId |

---

## 5. R3: Filter Strictness

### 5.1 Behavior Change

**Before:** Invalid filter values were silently ignored
**After:** Invalid filter values return 400 with field-level errors

### 5.2 Error Response

```json
{
  "error": "פילטרים לא חוקיים",
  "fields": {
    "status": "ערך לא חוקי עבור status. ערכים מותרים: פעיל, לא פעיל"
  }
}
```

### 5.3 Validated Filters by Entity

| Entity | Enum Filters |
|--------|--------------|
| contacts | status: ['פעיל', 'לא פעיל'] |
| projects | state: ['פעיל', 'הושלם', 'מושהה', 'מבוטל'], level: ['main', 'project', 'quarter', 'building'] |
| employees | status: ['פעיל', 'לא פעיל'] |
| vehicles | status: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD', 'all'] |
| equipment | status: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED', 'all'], isOffice: ['true', 'false'] |

---

## 6. R4: Client-Configurable Sorting

### 6.1 Query Parameters

| Parameter | Description |
|-----------|-------------|
| `sortBy` or `sort` | Field to sort by (must be in allowedFields) |
| `sortDir` or `order` | Direction: `asc` or `desc` |

### 6.2 Error Response for Invalid Sort

```json
{
  "error": "פרמטרי מיון לא חוקיים",
  "fields": {
    "sortBy": "שדה מיון לא חוקי: foo. שדות מותרים: firstName, lastName, email, ..."
  }
}
```

### 6.3 Allowed Sort Fields by Entity

| Entity | Fields |
|--------|--------|
| contacts | firstName, lastName, email, phone, status, createdAt, updatedAt |
| projects | projectNumber, name, state, category, createdAt, updatedAt, startDate, endDate |
| employees | firstName, lastName, role, department, status, startDate, createdAt, updatedAt |
| organizations | name, type, createdAt, updatedAt |
| vehicles | licensePlate, manufacturer, model, year, status, createdAt, updatedAt |
| equipment | type, manufacturer, model, status, createdAt, updatedAt |
| events | eventDate, eventType, createdAt |
| reviews | avgRating, createdAt |
| users | email, name, lastLogin, createdAt |

---

## 7. R5: API Versioning

### 7.1 Implementation

- Version extracted from `X-API-Version` header
- Default version: `1`
- Supported versions: `['1']`

### 7.2 Response Headers

All responses include:
```
X-API-Version: 1
X-API-Supported-Versions: 1
```

Deprecated versions also include:
```
X-API-Deprecated: true
Warning: 299 - "API version X is deprecated"
```

---

## 8. UI Consumer Updates

### 8.1 Updated Files

| File | Change |
|------|--------|
| `src/app/dashboard/contacts/page.tsx` | Extract `.items` from paginated response |
| `src/app/dashboard/projects/page.tsx` | Extract `.items` from paginated response |
| `src/app/dashboard/hr/page.tsx` | Extract `.items` from paginated response |
| `src/app/dashboard/vendors/page.tsx` | Extract `.items` from paginated response |
| `src/app/dashboard/vehicles/page.tsx` | Extract `.items` from paginated response |
| `src/app/dashboard/equipment/page.tsx` | Extract `.items` from paginated response |
| `src/app/dashboard/events/page.tsx` | Extract `.items` from paginated response |
| `src/app/dashboard/admin/users/page.tsx` | Extract `.items` from paginated response |

### 8.2 Backward Compatibility Pattern

All UI consumers use defensive pattern:
```javascript
const data = await res.json()
setItems(data.items || data) // Handles both old and new format
```

---

## 9. API Route Files Modified

### 9.1 List Endpoints (GET)

| File | Changes |
|------|---------|
| `src/app/api/contacts/route.ts` | R1, R3, R4, R5 |
| `src/app/api/projects/route.ts` | R1, R3, R4, R5 |
| `src/app/api/hr/route.ts` | R1, R3, R4, R5 |
| `src/app/api/organizations/route.ts` | R1, R3, R4, R5 |
| `src/app/api/vehicles/route.ts` | R1, R3, R4, R5 |
| `src/app/api/equipment/route.ts` | R1, R3, R4, R5 |
| `src/app/api/events/route.ts` | R1, R3, R4, R5 |
| `src/app/api/individual-reviews/route.ts` | R1, R3, R4, R5 |
| `src/app/api/admin/users/route.ts` | R1, R4, R5 |

### 9.2 Create Endpoints (POST)

| File | Changes |
|------|---------|
| `src/app/api/contacts/route.ts` | R2, R5 |
| `src/app/api/projects/route.ts` | R2, R5 |
| `src/app/api/hr/route.ts` | R2, R5 |
| `src/app/api/organizations/route.ts` | R2, R5 |
| `src/app/api/vehicles/route.ts` | R2, R5 |
| `src/app/api/equipment/route.ts` | R2, R5 |
| `src/app/api/individual-reviews/route.ts` | R2, R5 |

---

## 10. Verification

### 10.1 TypeScript Compilation

```
$ npx tsc --noEmit
(no errors)
```

### 10.2 Files Modified Summary

**API Routes:** 9 files
**UI Consumers:** 8 files
**Shared Utilities:** 1 file

**Total:** 18 files modified

---

## 11. Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Response shape: `[...]` → `{ items: [...], pagination: {...} }` | Clients expecting array will fail | UI updated with defensive `data.items \|\| data` pattern |
| Invalid filter returns 400 | Clients with typos in filters will get errors | Clear error messages with allowed values |
| Invalid sort returns 400 | Clients with invalid sort fields will get errors | Clear error messages with allowed fields |

---

## 12. Compliance Summary

| Requirement | Criterion IDs | Status |
|-------------|---------------|--------|
| R1: Pagination | L-PAGE-01, L-PAGE-02 | **COMPLIANT** |
| R2: Field-level Validation | R-ERR-03, E-VAL-02, E-VAL-03 | **COMPLIANT** |
| R3: Filter Strictness | L-FILT-02 | **COMPLIANT** |
| R4: Client-configurable Sorting | L-SORT-01, L-SORT-02 | **COMPLIANT** |
| R5: API Versioning | R-VER-01, R-VER-02 | **COMPLIANT** |

---

## STAGE 5.3b — COMPLETE

All 5 Maybach Standard requirements have been implemented.
TypeScript compilation passes.
UI consumers updated to handle new response format.

---

**Generated:** 2026-01-24
**Author:** Claude Code
