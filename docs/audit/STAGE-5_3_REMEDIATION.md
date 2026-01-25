# STAGE 5 — Phase 5.3: API Contract Remediation

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Remediation Complete
**Branch:** stage1-auth-policy-alignment

---

## 1. Remediation Scope

This phase addresses the 7 Major gaps identified in Phase 5.2. Minor gaps are documented as deferred per Stage 5.0 Section 8.3.

### 1.1 Gap Summary

| Classification | Count | Action |
|----------------|-------|--------|
| Critical | 0 | — |
| Major | 7 | 4 Fixed, 3 Deferred |
| Minor | 2 | Deferred |

---

## 2. Fixed Gaps

### 2.1 API-UI-001: Create Status Code Inconsistency

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-001 |
| **Criterion ID** | R-HTTP-02, M-CRE-01 |
| **Status** | **FIXED** |

**Fix Applied:**
Changed POST create endpoints from `status: 200` to `status: 201`.

**Files Changed:**

| File | Change |
|------|--------|
| `src/app/api/contacts/route.ts` | Line 140: Added `{ status: 201 }` |
| `src/app/api/projects/route.ts` | Line 342: Added `{ status: 201 }` |
| `src/app/api/hr/route.ts` | Line 172: Added `{ status: 201 }` |
| `src/app/api/organizations/route.ts` | Line 80: Added `{ status: 201 }` |
| `src/app/api/projects/[id]/contacts/route.ts` | Line 144: Added `{ status: 201 }` |

**Backward Compatibility:**
Non-breaking. HTTP 201 is semantically correct for resource creation and clients should handle all 2xx as success.

---

### 2.2 API-UI-002: Missing 409 Conflict Semantics

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-002 |
| **Criterion ID** | E-CONF-01, E-CONF-02, E-CONF-03, E-CONF-04 |
| **Status** | **FIXED** |

**Fix Applied:**
Changed uniqueness violation responses from `status: 400` to `status: 409`.

**Files Changed:**

| File | Change |
|------|--------|
| `src/app/api/hr/route.ts` | Line 101: 400 → 409 (duplicate ID number) |
| `src/app/api/hr/[id]/route.ts` | Line 158: 400 → 409 (ID number conflict) |
| `src/app/api/vehicles/route.ts` | Line 87: 400 → 409 (duplicate license plate) |
| `src/app/api/vehicles/[id]/route.ts` | Line 169: 400 → 409 (license plate conflict) |
| `src/app/api/equipment/route.ts` | Line 109: 400 → 409 (duplicate serial number) |
| `src/app/api/equipment/[id]/route.ts` | Line 119: 400 → 409 (serial number conflict) |
| `src/app/api/individual-reviews/route.ts` | Line 106: 400 → 409 (duplicate review) |
| `src/app/api/projects/[id]/contacts/route.ts` | Line 95: 400 → 409 (duplicate association) |

**Backward Compatibility:**
Potentially breaking for clients that specifically check for 400 on duplicate errors. However, per RFC 7231, 409 Conflict is the correct status for this condition. Clients checking for 4xx will continue to work.

---

### 2.3 API-UI-006: Error Message Language Inconsistency

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-006 |
| **Criterion ID** | R-ERR-02, E-AUTH-04, E-404-03 |
| **Status** | **FIXED** |

**Fix Applied:**
Standardized error messages across all endpoints:
- **401 Unauthorized**: English `'Unauthorized'` (consistent with majority)
- **403 Forbidden**: Hebrew `'אין הרשאה ל...'` (consistent with majority)
- **404 Not Found**: Hebrew for all entity types

**Files Changed:**

| File | Change |
|------|--------|
| `src/app/api/admin/import-contacts/parse/route.ts` | 401: 'לא מורשה' → 'Unauthorized' |
| `src/app/api/admin/import-contacts/save/route.ts` | 401: 'לא מורשה' → 'Unauthorized' |
| `src/app/api/admin/users/route.ts` | 403: 'Forbidden' → 'אין הרשאה לניהול משתמשים' |
| `src/app/api/projects/[id]/route.ts` | 404: 'Project not found' → 'פרויקט לא נמצא' (3 locations) |
| `src/app/api/hr/[id]/route.ts` | 404: 'Employee not found' → 'עובד לא נמצא' (3 locations) |
| `src/app/api/vehicles/[id]/route.ts` | 404: 'Vehicle not found' → 'רכב לא נמצא' |
| `src/app/api/equipment/[id]/route.ts` | 404: 'Equipment not found' → 'ציוד לא נמצא' (3 locations) |
| `src/app/api/events/[id]/route.ts` | 404: 'Event not found' → 'אירוע לא נמצא' |

**Backward Compatibility:**
Non-breaking per Stage 5.0 Section 7.2: "Improving error messages" is listed as non-breaking. Message semantics unchanged.

---

### 2.4 API-UI-007: DELETE Idempotency Inconsistency

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-007 |
| **Criterion ID** | M-DEL-02, M-IDEM-03 |
| **Status** | **FIXED** |

**Fix Applied:**
Added 404 Not Found checks before DELETE operations to ensure consistent idempotent behavior.

**Files Changed:**

| File | Change |
|------|--------|
| `src/app/api/contacts/[id]/route.ts` | Added null check after findUnique, return 404 if not found |
| `src/app/api/vehicles/[id]/route.ts` | Added null check after findUnique, return 404 if not found |
| `src/app/api/events/[id]/route.ts` | Added null check after findUnique, return 404 if not found |
| `src/app/api/organizations/[id]/route.ts` | Added null check after findUnique, return 404 if not found |

**Note:** `hr/[id]`, `projects/[id]`, and `equipment/[id]` already had proper 404 checks.

**Backward Compatibility:**
Previously, deleting a non-existent resource would return 500 (Prisma error). Now returns 404. This is a behavioral improvement that aligns with REST conventions. Clients retrying deletes will now receive consistent 404 responses.

---

## 3. Deferred Gaps

### 3.1 API-UI-003: Field-Level Validation Errors

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-003 |
| **Criterion ID** | R-ERR-03, E-VAL-02, E-VAL-03 |
| **Status** | **DEFERRED** |

**Justification:**
While adding an optional `fields` property to error responses is technically non-breaking, implementing comprehensive field-level validation requires:

1. Creating a validation utility across all endpoints
2. Refactoring all validation logic to collect errors
3. Updating error response construction in 50+ locations
4. Coordinating with UI to display field-level errors

This is a significant refactoring effort that exceeds the scope of minimal remediation.

**Recommendation:**
Implement in a dedicated sprint with coordinated UI changes.

---

### 3.2 API-UI-004: Pagination Consistency

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-004 |
| **Criterion ID** | L-PAGE-01, L-PAGE-02 |
| **Status** | **DEFERRED** |

**Justification:**
Changing list endpoints from direct array `[...]` to paginated envelope `{ items: [...], pagination: {...} }` is a **breaking change** per Stage 5.0 Section 7.1:

> "Response shape inconsistency" — clients parsing arrays will fail on objects.

This change requires API versioning to implement safely.

**Recommendation:**
Implement with API version 2 (`/api/v2/`) to preserve backward compatibility.

---

### 3.3 API-UI-005: Invalid Filter Validation

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-005 |
| **Criterion ID** | L-FILT-02 |
| **Status** | **DEFERRED** |

**Justification:**
Currently, invalid filter values are silently ignored. Adding validation to return 400 could break existing clients that:

1. Send typos in filter values
2. Send deprecated filter values
3. Send filter values for future features

While the criteria require this behavior, implementing it without warning could cause unexpected failures for existing integrations.

**Recommendation:**
1. Add logging for invalid filter values (observability)
2. Announce deprecation of silent filter handling
3. Enable strict validation after grace period

---

### 3.4 API-UI-008: No Client-Configurable Sorting (Minor)

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-008 |
| **Classification** | Minor |
| **Status** | **DEFERRED** |

**Justification:**
Adding sort parameters is non-breaking but represents a feature addition rather than a contract fix. Current fixed sort orders are reasonable defaults.

---

### 3.5 API-UI-009: No API Versioning Mechanism (Minor)

| Attribute | Value |
|-----------|-------|
| **Gap ID** | API-UI-009 |
| **Classification** | Minor |
| **Status** | **DEFERRED** |

**Justification:**
API versioning is recommended for external APIs but not strictly required for internal-only APIs. The WDI-ERP API is currently internal only. Versioning should be implemented when breaking changes (like API-UI-004) are planned.

---

## 4. Verification

### 4.1 TypeScript Compilation

```
$ npx tsc --noEmit
(no errors)
```

### 4.2 Files Modified Summary

| File | Changes |
|------|---------|
| `src/app/api/contacts/route.ts` | 201 status |
| `src/app/api/contacts/[id]/route.ts` | 404 check on DELETE |
| `src/app/api/projects/route.ts` | 201 status |
| `src/app/api/projects/[id]/route.ts` | Hebrew 404 messages |
| `src/app/api/projects/[id]/contacts/route.ts` | 201 status, 409 conflict |
| `src/app/api/hr/route.ts` | 201 status, 409 conflict |
| `src/app/api/hr/[id]/route.ts` | 409 conflict, Hebrew 404 |
| `src/app/api/organizations/route.ts` | 201 status |
| `src/app/api/organizations/[id]/route.ts` | 404 check on DELETE |
| `src/app/api/vehicles/route.ts` | 409 conflict |
| `src/app/api/vehicles/[id]/route.ts` | 409 conflict, Hebrew 404, 404 check on DELETE |
| `src/app/api/equipment/route.ts` | 409 conflict |
| `src/app/api/equipment/[id]/route.ts` | 409 conflict, Hebrew 404 |
| `src/app/api/events/[id]/route.ts` | Hebrew 404, 404 check on DELETE |
| `src/app/api/individual-reviews/route.ts` | 409 conflict |
| `src/app/api/admin/users/route.ts` | Hebrew 403 |
| `src/app/api/admin/import-contacts/parse/route.ts` | English 401 |
| `src/app/api/admin/import-contacts/save/route.ts` | English 401 |

**Total files modified:** 18

---

## 5. Remediation Summary

| Gap ID | Classification | Status | Action |
|--------|----------------|--------|--------|
| API-UI-001 | Major | **FIXED** | Create 200 → 201 |
| API-UI-002 | Major | **FIXED** | Uniqueness 400 → 409 |
| API-UI-003 | Major | Deferred | Field-level errors (refactoring scope) |
| API-UI-004 | Major | Deferred | Pagination (breaking change) |
| API-UI-005 | Major | Deferred | Filter validation (breaking change) |
| API-UI-006 | Major | **FIXED** | Error message language |
| API-UI-007 | Major | **FIXED** | DELETE 404 consistency |
| API-UI-008 | Minor | Deferred | Sort parameters (feature) |
| API-UI-009 | Minor | Deferred | API versioning (feature) |

**Major gaps fixed:** 4/7
**Major gaps deferred with justification:** 3/7
**Minor gaps deferred:** 2/2

---

## 6. Next Steps

1. **Phase 5.4 Re-Audit:** Verify fixed gaps meet criteria
2. **Future sprint:** Implement API-UI-003 (field-level validation) with UI coordination
3. **API v2 planning:** Implement API-UI-004 (pagination) with versioning strategy
4. **Monitoring:** Add logging for invalid filter values (prep for API-UI-005)

---

**Generated:** 2026-01-24
**Author:** Claude Code
