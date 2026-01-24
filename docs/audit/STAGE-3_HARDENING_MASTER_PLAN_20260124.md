# STAGE 3 — Hardening Master Plan

## Executive Summary

Stage 2 achieved data integrity (all multi-write flows are now atomic). Stage 3 addresses the next layer: **who can do what, safely and observably**.

This plan has three phases in strict order:
1. **Authorization** — because a secure transaction is meaningless if unauthorized users can execute it
2. **Idempotency** — because authorized operations must be safe to retry without corruption
3. **Observability** — because secure, safe operations must be auditable for compliance

Each phase builds on the previous. Skipping or reordering creates gaps. The order is: secure first, then safe, then observable.

---

## Phase 3.1: Authorization Boundary Hardening

### Objective

Ensure every API endpoint enforces role-based authorization at the server level, per DOC-006 requirements. No endpoint should rely on authentication alone.

### Definition of Done

- [ ] Every POST/PUT/DELETE endpoint has explicit role check before business logic
- [ ] Role checks use a consistent pattern (centralized helper or middleware)
- [ ] Authorization failures return 403 with audit log entry
- [ ] No hardcoded user IDs for special access
- [ ] All role checks documented in endpoint comments

### Audit Checklist

| Check | Method | Target |
|-------|--------|--------|
| Missing role checks | Grep for `auth()` without subsequent role verification | All `src/app/api/**/*.ts` |
| Inconsistent role lists | Grep for inline role arrays like `['founder', 'ceo']` | All route handlers |
| UI-only enforcement | Search for permission checks only in frontend | `src/components/**/*.tsx` |
| Sensitive data exposure | Check GET endpoints returning PII without role filter | HR, contacts, organizations |

### Ranked Targets

| Priority | Endpoint | Risk | Rationale |
|----------|----------|------|-----------|
| P0 | `api/hr/**` | HIGH | PII (idNumber, grossSalary) — partial fix exists |
| P0 | `api/admin/**` | HIGH | Administrative functions with elevated impact |
| P1 | `api/contacts/**` | MEDIUM | Business data, some PII potential |
| P1 | `api/projects/**` | MEDIUM | Business-critical, multi-user access |
| P1 | `api/organizations/**` | MEDIUM | Vendor data, financial implications |
| P2 | `api/vehicles/**` | LOW | Asset tracking, less sensitive |
| P2 | `api/equipment/**` | LOW | Asset tracking, less sensitive |
| P2 | `api/individual-reviews/**` | LOW | Internal ratings, reviewer-scoped |

### Risks If Skipped

- Any authenticated user can access/modify any data
- PII exposure (GDPR/privacy violation risk)
- Business data tampering by unauthorized employees
- Violates DOC-005 §4.2 and DOC-006 §5.2

---

## Phase 3.2: Idempotency & Replay Safety

### Objective

Ensure import operations, retryable mutations, and background jobs cannot corrupt data when executed multiple times. Operations must be safe to retry.

### Definition of Done

- [ ] All import endpoints have duplicate-detection before create
- [ ] Import operations return clear status (created/skipped/updated counts)
- [ ] No silent partial failures — either all-or-nothing or explicit partial status
- [ ] Background jobs have idempotency keys or state checks
- [ ] Retry-safe patterns documented for each import type

### Audit Checklist

| Check | Method | Target |
|-------|--------|--------|
| Import without dedup | Read import routes, verify findFirst before create | `api/**/import/*.ts` |
| Silent continue on error | Grep for `catch.*continue` without logging | All import loops |
| Missing idempotency key | Check if unique constraint or lookup exists | All create operations in loops |
| Background job safety | Verify state check before processing | Any async/background handlers |

### Ranked Targets

| Priority | Endpoint/Module | Risk | Rationale |
|----------|-----------------|------|-----------|
| P0 | `api/contacts/import` | HIGH | Bulk import, duplicate contacts cause confusion |
| P0 | `api/admin/import-contacts/save` | HIGH | Complex enrichment flow, multiple entity types |
| P1 | `api/organizations/import` | MEDIUM | Bulk org creation |
| P1 | `api/admin/duplicates/scan` | MEDIUM | Repeated scans create duplicate DuplicateSets |
| P2 | `api/events/from-email` | LOW | External trigger, potential replays |
| P2 | `api/extract-text` | LOW | Async processing, retry scenarios |

### Current State (from Stage 2)

Import routes now use transactions (all-or-nothing), which prevents partial state. However:
- `contacts/import` skips duplicates silently (acceptable but should log)
- `admin/import-contacts/save` has dedup logic but complex merge behavior
- `admin/duplicates/scan` may create duplicate DuplicateSets on re-scan

### Risks If Skipped

- Duplicate records from retried imports
- Data inconsistency from partial replays
- User confusion from silent failures
- Violates DOC-005 §2.3 (defense in depth) for operational safety

---

## Phase 3.3: Observability & Audit Trail Guarantees

### Objective

Ensure every mutation generates an audit trail entry, per DOC-008 requirements. Verify audit coverage is complete and consistent.

### Definition of Done

- [ ] Every create/update/delete operation calls `logCrud` or equivalent
- [ ] Audit logs include: actor, action, target entity, timestamp, changes
- [ ] Authorization failures are logged
- [ ] No mutations bypass audit logging
- [ ] Audit entries are inside transactions where atomicity matters

### Audit Checklist

| Check | Method | Target |
|-------|--------|--------|
| Missing logCrud calls | Compare mutation endpoints vs logCrud grep results | All `api/**/*.ts` with mutations |
| Incomplete log data | Read logCrud calls, verify they include changes object | All existing logCrud calls |
| Auth failure logging | Verify 401/403 responses also log | All auth checks |
| Log outside transaction | Check if logCrud is inside or outside $transaction | All transactional endpoints |

### Coverage Gap Analysis (from grep)

**Endpoints with logCrud (34 files):** hr, projects, contacts, individual-reviews, equipment, vehicles, organizations, events, duplicates, upload

**Potential gaps to verify:**
- `api/contacts/[id]` — DELETE may be missing log
- `api/events/from-email` — external integration, verify logging
- All vehicle sub-routes (accidents, tolls, fuel, etc.) — verify each CRUD logs

### Ranked Targets

| Priority | Area | Risk | Rationale |
|----------|------|------|-----------|
| P0 | Authorization failure logging | HIGH | Security forensics require denied access records |
| P0 | HR mutations (sensitive data) | HIGH | PII changes must be auditable |
| P1 | All DELETE operations | MEDIUM | Destructive actions need audit trail |
| P1 | Import operations (bulk) | MEDIUM | Bulk changes need summary logging |
| P2 | Vehicle sub-entity CRUD | LOW | Many sub-routes, verify coverage |
| P2 | Equipment CRUD | LOW | Less sensitive, verify completeness |

### Risks If Skipped

- Cannot investigate security incidents
- Compliance failures (no audit evidence)
- Cannot reconstruct data changes for recovery
- Violates DOC-008 §4.2 (auditable events)

---

## Zero-Leftovers Closure Criteria

Stage 3 is **CLEAN** when ALL of the following are true:

### Phase 3.1 Closure

```
Grep: Every POST/PUT/DELETE handler in src/app/api/**
      contains explicit role check BEFORE mutation logic.

Result: 0 mutation endpoints without role verification.
```

### Phase 3.2 Closure

```
Review: Every import/batch endpoint has:
        - Duplicate detection (findFirst/findUnique before create)
        - Clear return status (created/skipped/updated counts)
        - No silent catch-continue without logging

Result: 0 import endpoints with silent failure patterns.
```

### Phase 3.3 Closure

```
Grep: Every create/update/delete call in src/app/api/**
      has corresponding logCrud/logActivity call.

Result: 0 mutation operations without audit logging.
```

### Final Verification

Create `docs/audit/STAGE-3_REAUDIT_YYYYMMDD.md` with:
- Phase 3.1: List of all endpoints + their role check status
- Phase 3.2: List of all import/batch endpoints + their idempotency pattern
- Phase 3.3: List of all mutation endpoints + their audit log call

Summary line: **"Stage 3 Hardening: PASS — 0 authorization gaps, 0 idempotency gaps, 0 audit gaps"**

---

## Execution Order

1. **Phase 3.1 first** — Security is non-negotiable; unauthorized access nullifies all other guarantees
2. **Phase 3.2 second** — Once access is controlled, ensure operations are safe to retry
3. **Phase 3.3 third** — Once operations are secure and safe, ensure they're observable

Do not parallelize phases. Complete each phase's closure criteria before starting the next.

---

## References

- DOC-005: Security, Privacy & Data Handling Constitution
- DOC-006: Authorization Model & RBAC Specification
- DOC-008: Observability & Audit Trail Policy
- Stage 2 Re-Audit: docs/audit/STAGE-2_REAUDIT_20260124.md

---

End of Plan
