---
Document ID: REMEDIATION-002
Document Title: RBAC v2 Compliance & Remediation Plan
Document Type: Remediation Plan
Status: Pending Approval
Authority: DOC-016 (Authorization Invariants & Enforcement Constitution)
Foundation Documents: DOC-006, DOC-013 v2.0, DOC-014 v2.0, DOC-016 v2.0
Scope: All authorization code, API routes, Agent, Admin UI
Owner: Engineering Leadership
Created: 2026-02-02
Last Updated: 2026-02-02
Version: 1.0
---

# REMEDIATION-002 — RBAC v2 Compliance & Remediation Plan

---

## 1. Executive Summary

### 1.1 Compliance Status

| Metric | Value |
|--------|-------|
| **Overall Status** | **FAIL** |
| **CRITICAL Violations** | 7 |
| **HIGH Violations** | 9 |
| **MEDIUM Violations** | 3 |
| **Total Violations** | 19 |
| **Deployment Safety** | **NOT SAFE** — Active privilege escalation vectors exist |

### 1.2 Critical Findings Summary

The current authorization implementation has **fundamental architectural defects** that violate DOC-016 constitutional invariants. The system cannot be considered secure in its current state.

**Root Causes of Production Failures:**

1. **Tamir Upload Failure**: `User.employeeId` is NULL → `checkProjectAssignment()` returns false (FP-008) → ASSIGNED scope denies all → uploads blocked despite valid role
2. **Arik Agent Block**: `session.user.role` undefined → defaults to 'USER' → Agent hardcoded matrix maps to 'all_employees' → limited access despite Owner role (FP-009, INV-010)
3. **Wrong Effective Permissions Display**: `evaluateAuthorization()` called without targetEntity → ASSIGNED scope with no projects returns false → UI shows ✗ instead of scope indicator (§7.2 violation)

**Primary Architectural Defects:**

| Defect | Severity | Root Cause |
|--------|----------|------------|
| Multi-role per user | CRITICAL | Violates INV-007 (Single Role Per User) |
| Three parallel auth engines | CRITICAL | Violates INV-009 (Single Authorization Engine), FP-002 |
| Agent hardcoded matrix | CRITICAL | Violates INV-010 (Database Is Truth), FP-009 |
| Visibility Grants active | CRITICAL | Violates FP-006 (Visibility Grants Rejected) |
| Missing auth checks on routes | CRITICAL | Violates INV-004 (Missing Check = Defect) |
| Hardcoded role arrays | HIGH | Violates FP-003 |
| Identity linkage optional | HIGH | Violates FP-008, §4.1 |

---

## 2. Canonical Compliance Matrix

### 2.1 Authorization Engine Violations

| Area | File/Route | Violation | Canon Reference | Severity |
|------|-----------|-----------|-----------------|----------|
| Auth Engine | `src/lib/authorization.ts` | V1 legacy engine running parallel to V2 | INV-009, FP-002 | CRITICAL |
| Auth Engine | `src/lib/permissions.ts` | V2 engine incomplete - doesn't handle all routes | INV-009 | HIGH |
| Auth Engine | `src/lib/agent-response.ts` | Third engine with hardcoded matrix | INV-010, FP-009 | CRITICAL |
| Session | `src/lib/auth.ts:106-113` | Unions permissions across multiple roles | INV-007 | CRITICAL |

### 2.2 Database Schema Violations

| Area | File/Route | Violation | Canon Reference | Severity |
|------|-----------|-----------|-----------------|----------|
| Schema | `prisma/schema.prisma` (User.employeeId) | Identity linkage optional (`String?`) | FP-008, §4.1 | HIGH |
| Schema | `prisma/schema.prisma` (UserRole) | Multi-role junction table exists | INV-007 | CRITICAL |
| Schema | `prisma/schema.prisma` (VisibilityGrant) | Visibility Grant table exists | FP-006 | CRITICAL |

### 2.3 API Route Violations

| Area | File/Route | Violation | Canon Reference | Severity |
|------|-----------|-----------|-----------------|----------|
| Upload | `src/app/api/upload/route.ts:21-23` | No authorization check (auth only) | INV-004 | CRITICAL |
| Events | `src/app/api/projects/[id]/events/route.ts` GET | No permission check | INV-004 | HIGH |
| Organizations | `src/app/api/organizations/route.ts` GET | No permission check | INV-004 | HIGH |
| Admin Users | `src/app/api/admin/users/route.ts` | Uses blanket `checkAdminAccess()` | FP-003, §6.1 | HIGH |
| Admin User Detail | `src/app/api/admin/users/[id]/route.ts` | Uses blanket `checkAdminAccess()` | FP-003, §6.1 | HIGH |

### 2.4 Scope Enforcement Violations

| Area | File/Route | Violation | Canon Reference | Severity |
|------|-----------|-----------|-----------------|----------|
| Scope | `src/lib/permissions.ts:244-246` | Returns false if no employeeId (blocks valid users) | FP-008 | HIGH |
| Scope | `src/lib/permissions.ts:276-285` | Visibility Grants for ALL operations (not just READ) | FP-005, FP-006 | CRITICAL |
| Scope | `src/lib/authorization.ts:310-314` | Visibility Grants for ALL operations (not just READ) | FP-005, FP-006 | CRITICAL |

### 2.5 Agent Violations

| Area | File/Route | Violation | Canon Reference | Severity |
|------|-----------|-----------|-----------------|----------|
| Agent | `src/lib/agent-response.ts:322-472` | Hardcoded `AGENT_MODULE_PERMISSIONS` matrix | INV-010, FP-009, AG-004 | CRITICAL |
| Agent | `src/app/api/agent/route.ts:127` | Role defaults to 'USER' if undefined | INV-008 | HIGH |
| Agent | `src/app/api/agent/route.ts:240` | Uses `hasModuleAccess()` not database permissions | INV-010, FP-009 | CRITICAL |

### 2.6 UI/Component Violations

| Area | File/Route | Violation | Canon Reference | Severity |
|------|-----------|-----------|-----------------|----------|
| Sidebar | `src/components/Sidebar.tsx:24` | Hardcoded `RBAC_ADMIN_ROLES = ['owner', 'trust_officer']` | FP-003 | MEDIUM |
| Admin UI | Effective permissions display | Evaluates through auth engine, not DB state | §7.2 | MEDIUM |

---

## 3. Violations by Invariant

### 3.1 INV-001: READ Does Not Imply WRITE

**Status:** VIOLATED

**Evidence:**
- `src/lib/permissions.ts:276-285`: `checkProjectAssignment()` includes Visibility Grants for CREATE, UPDATE, DELETE operations
- `src/lib/authorization.ts:310-314`: Same issue in V1 engine

**Impact:** Users with read-only Visibility Grants may gain write access.

**Remediation Required:** Remove Visibility Grant evaluation from write operation paths entirely.

---

### 3.2 INV-004: Missing Authorization Check Is a Security Defect

**Status:** VIOLATED

**Evidence:**
- `src/app/api/upload/route.ts:21-23`: Only authentication check, no authorization
  ```typescript
  if (!session) {
    return NextResponse.json({ error: 'אין לך הרשאה' }, { status: 401 })
  }
  // NO authorization check follows
  ```
- `src/app/api/projects/[id]/events/route.ts` GET handler: No permission check
- `src/app/api/organizations/route.ts` GET handler: No permission check

**Impact:** Any authenticated user can upload files and access data regardless of role.

**Remediation Required:** Add `requirePermission()` calls to all data-accessing routes.

---

### 3.3 INV-007: Single Role Per User

**Status:** VIOLATED (CRITICAL)

**Evidence:**
- `prisma/schema.prisma`:
  ```prisma
  model User {
    roles UserRole[]  // Multi-role junction table
  }
  ```
- `src/lib/auth.ts:106-113`:
  ```typescript
  const permissionSet = new Set<string>()
  for (const userRole of dbUser.roles) {  // Iterates MULTIPLE roles
    for (const rp of userRole.role.permissions) {
      permissionSet.add(...)  // UNIONS permissions
    }
  }
  ```

**Impact:** Privilege escalation via permission union. A user with roles [A, B] gains permissions of both A AND B, violating mutual exclusivity.

**Remediation Required:**
1. Enforce single role at database level
2. Remove multi-role iteration in session loading
3. Migration to consolidate existing multi-role users

---

### 3.4 INV-008: Authorization Failures Fail Closed

**Status:** VIOLATED

**Evidence:**
- `src/app/api/agent/route.ts:127`:
  ```typescript
  const userRole = (session.user as any)?.role || 'USER'
  ```
  Defaults to 'USER' when role is undefined. 'USER' is not a canonical role (DOC-014 §2) and maps to 'all_employees' in the Agent matrix.

**Impact:** Users with undefined roles get arbitrary default access instead of DENY.

**Remediation Required:** Return explicit DENY when role cannot be determined.

---

### 3.5 INV-009: Single Authorization Engine Is the Target State

**Status:** VIOLATED (CRITICAL)

**Evidence:**
Three parallel authorization engines exist:

| Engine | Location | Used By |
|--------|----------|---------|
| V1 | `src/lib/authorization.ts` | Admin routes, some API routes |
| V2 | `src/lib/permissions.ts` | Most operational routes |
| Agent | `src/lib/agent-response.ts` | Agent module exclusively |

**Impact:** Authorization decisions are inconsistent. Same user may have different access depending on which engine evaluates the request.

**Remediation Required:** Converge on single V2 engine for all routes.

---

### 3.6 INV-010: Database State Is the Sole Source of Permission Truth

**Status:** VIOLATED (CRITICAL)

**Evidence:**
- `src/lib/agent-response.ts:322-472`: Hardcoded `AGENT_MODULE_PERMISSIONS` matrix
  ```typescript
  const AGENT_MODULE_PERMISSIONS: Record<CanonicalRole, Record<string, ModulePermissions>> = {
    owner: { contacts: { canRead: true, canWrite: false }, ... },
    // ... 150+ lines of hardcoded permissions
  }
  ```

**Impact:** Agent permissions diverge from database. Permission changes in DB do not affect Agent access.

**Remediation Required:** Agent must derive access from user's session permissions loaded from database.

---

### 3.7 INV-011: Role Names and Count Must Match Canon

**Status:** COMPLIANT

**Evidence:**
- `prisma/seed.ts` correctly seeds 10 canonical roles matching DOC-014 §2

---

### 3.8 INV-012: Uniform Enforcement Across All Access Paths

**Status:** VIOLATED

**Evidence:**
Three different authorization engines with different logic (see INV-009).

**Impact:** Non-uniform enforcement. Agent path differs from API path.

---

## 4. Forbidden Pattern Violations

### 4.1 FP-002: Parallel Authorization Engines in Production — CRITICAL

**Status:** VIOLATED

**Evidence:** See INV-009. Three engines operating in parallel.

**Remediation Required:** Consolidate to single engine.

---

### 4.2 FP-003: Hardcoded Role Arrays as Security Gates — HIGH

**Status:** VIOLATED

**Evidence:**
- `src/lib/authorization.ts:531`:
  ```typescript
  export function checkAdminAccess(session: any): boolean {
    // Hardcoded to ['owner', 'trust_officer']
  }
  ```
- `src/components/Sidebar.tsx:24`:
  ```typescript
  const RBAC_ADMIN_ROLES = ['owner', 'trust_officer']
  ```
- `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`: Use `checkAdminAccess()`

**Impact:** Authorization bypasses database. Adding new admin roles requires code changes instead of DB updates.

**Remediation Required:** Replace with permission-based checks (`admin:READ`, `admin:UPDATE`, etc.).

---

### 4.3 FP-005: Knowledge/Visibility Mechanisms Enabling Writes — CRITICAL

**Status:** VIOLATED

**Evidence:**
- `src/lib/permissions.ts:276-285`: `checkProjectAssignment()` includes Visibility Grants for ALL operations including CREATE, UPDATE, DELETE
- `src/lib/authorization.ts:310-314`: Same issue

**Impact:** Visibility Grants (read-only by design) can enable write access.

**Remediation Required:** Remove Visibility Grant evaluation from write paths entirely.

---

### 4.4 FP-006: Visibility Grants as an Active Mechanism — CRITICAL

**Status:** VIOLATED

**Evidence:**
- `prisma/schema.prisma`: `VisibilityGrant` table exists
- Both authorization engines evaluate Visibility Grants

Per DOC-016 §8: "Visibility Grants are an explicitly rejected RBAC pattern in v2; read scope is built into roles... This pattern MUST NOT be restricted, refactored, or made read-only — it MUST be removed entirely."

**Impact:** Non-canonical authorization mechanism active in production.

**Remediation Required:** Complete removal of VisibilityGrant table and all code references.

---

### 4.5 FP-008: Scope Resolution Without Identity Linkage — HIGH

**Status:** VIOLATED

**Evidence:**
- `src/lib/permissions.ts:244-246`:
  ```typescript
  async function checkProjectAssignment(userId, employeeId, projectId) {
    if (!employeeId) {
      return false  // BLOCKS USERS WITHOUT EMPLOYEE LINK
    }
  ```
- `prisma/schema.prisma`: `User.employeeId` is optional (`String?`)

**Impact:** Users without employee linkage are blocked from all scoped operations, but the blocking occurs silently at scope resolution rather than at a defined enforcement point.

**Remediation Required:**
1. Per §4.1: "Without identity linkage, scoped permission evaluation MUST return DENY for any scope narrower than ALL"
2. Should fail at defined point with clear error, not deep in scope resolution
3. Consider making identity linkage mandatory for operational users

---

### 4.6 FP-009: Agent Access via Hardcoded Permission Matrix — CRITICAL

**Status:** VIOLATED

**Evidence:**
- `src/lib/agent-response.ts:322-472`: 150+ lines of hardcoded `AGENT_MODULE_PERMISSIONS`
- `src/app/api/agent/route.ts:240`: Uses `hasModuleAccess()` which reads from hardcoded matrix

**Impact:** Agent authorization completely disconnected from database permissions.

**Remediation Required:** Agent must use database-driven permissions from session.

---

### 4.7 FP-010: UI-Only Authorization Enforcement — HIGH

**Status:** PARTIALLY VIOLATED

**Evidence:**
- `src/components/Sidebar.tsx`: Menu items shown to all users (no permission filtering)
- Some admin menu items may be visible but server-side checks exist

**Impact:** UI shows options users cannot use, but server blocks unauthorized actions.

**Remediation Required:** Add permission-based UI filtering (UX improvement, not security).

---

## 5. Authorization Surface Audit

### 5.1 API Routes Without Authorization

| Route | HTTP Method | Issue | Severity |
|-------|-------------|-------|----------|
| `/api/upload` | POST | Auth only, no authz | CRITICAL |
| `/api/projects/[id]/events` | GET | No permission check | HIGH |
| `/api/organizations` | GET | No permission check | HIGH |

### 5.2 Admin Routes Using Blanket Access

| Route | HTTP Method | Current Check | Required Per §6.1 |
|-------|-------------|---------------|-------------------|
| `/api/admin/users` | GET | `checkAdminAccess()` | `admin:READ` |
| `/api/admin/users` | POST | None explicit | `admin:CREATE` |
| `/api/admin/users/[id]` | GET | `checkAdminAccess()` | `admin:READ` |
| `/api/admin/users/[id]` | PATCH | `checkAdminAccess()` | `admin:UPDATE` |
| `/api/admin/users/[id]/roles` | PUT | `checkAdminAccess()` + `canModifyRbac()` | `admin:UPDATE` + §6.3 governance |

### 5.3 Agent Access Control Audit

| Issue | Current State | Required State |
|-------|---------------|----------------|
| Permission Source | Hardcoded matrix | Database via session |
| Scope Enforcement | None (matrix has no scope concept) | Filter by user's READ scope |
| Write Prevention | Hardcoded `canWrite: false` | AG-001: Architectural constraint |

### 5.4 Scope Enforcement Audit

| Scope | Current Implementation | Defect |
|-------|----------------------|--------|
| ALL | Works correctly | None |
| DOMAIN | Not fully implemented | Missing domain membership check |
| ASSIGNED | Fails if no employeeId | FP-008 |
| OWN | Partially implemented | Inconsistent across routes |
| SELF | Limited to HR card | Works for intended purpose |
| MAIN_PAGE | Not implemented | Missing from V2 engine |

---

## 6. Remediation Phases

### Phase 0: Stabilization (Immediate — No Deployment Until Complete)

**Goal:** Stop the bleeding. Prevent active privilege escalation.

**Invariants Addressed:** INV-004, INV-008

**Preconditions:** None

**Tasks:**
1. Add missing authorization checks to unprotected routes
   - `/api/upload`: Add `requirePermission(session, 'events', 'create', { projectId })`
   - `/api/projects/[id]/events` GET: Add `requirePermission(session, 'events', 'read', { projectId })`
   - `/api/organizations` GET: Add `requirePermission(session, 'contacts', 'read')`
2. Fix Agent role defaulting to DENY not 'USER'
3. Add temporary logging for all authorization decisions

**Acceptance Criteria:**
- [ ] Zero routes without authorization checks (CC-001)
- [ ] Agent returns 403 for undefined roles, not default access
- [ ] All authorization decisions logged

---

### Phase 1: Visibility Grant Elimination

**Goal:** Remove rejected RBAC pattern completely.

**Invariants Addressed:** FP-005, FP-006, INV-001

**Preconditions:** Phase 0 complete

**Tasks:**
1. Remove Visibility Grant checks from `permissions.ts`
2. Remove Visibility Grant checks from `authorization.ts`
3. Create migration to drop `VisibilityGrant` table
4. Remove all code references to VisibilityGrant model

**Acceptance Criteria:**
- [ ] No code references to VisibilityGrant (CC-015)
- [ ] VisibilityGrant table dropped
- [ ] Write operations cannot be enabled by visibility mechanisms

---

### Phase 2: Single Role Enforcement

**Goal:** Enforce INV-007 (Single Role Per User).

**Invariants Addressed:** INV-007

**Preconditions:** Phase 1 complete

**Tasks:**
1. Audit all users for multi-role assignments
2. Create migration plan to consolidate multi-role users (highest role wins)
3. Add database constraint: unique user_id in UserRole OR convert to User.roleId
4. Update session loading to read single role only
5. Update admin UI to enforce single role assignment

**Acceptance Criteria:**
- [ ] No user has multiple role assignments
- [ ] Session.permissions derived from exactly one role
- [ ] Database constraint prevents multi-role assignment

---

### Phase 3: Engine Consolidation

**Goal:** Single authorization engine for all routes.

**Invariants Addressed:** INV-009, INV-012, FP-002

**Preconditions:** Phase 2 complete

**Tasks:**
1. Identify all routes using V1 engine (`authorization.ts`)
2. Migrate each route to V2 engine (`permissions.ts`)
3. Deprecate and remove `authorization.ts` exports
4. Update admin routes to use operation-specific checks per §6.1

**Acceptance Criteria:**
- [ ] All routes use V2 engine (CC-006)
- [ ] `authorization.ts` deprecated/removed
- [ ] Admin routes check specific operations, not blanket access

---

### Phase 4: Agent Database Integration

**Goal:** Agent uses database permissions, not hardcoded matrix.

**Invariants Addressed:** INV-010, FP-009, AG-004

**Preconditions:** Phase 3 complete

**Tasks:**
1. Remove `AGENT_MODULE_PERMISSIONS` hardcoded matrix
2. Update `hasModuleAccess()` to read from session.permissions
3. Add scope filtering to Agent queries
4. Verify AG-001 through AG-005 compliance

**Acceptance Criteria:**
- [ ] No hardcoded permission matrices in codebase
- [ ] Agent derives access from database via session
- [ ] Agent respects user's READ scope boundaries

---

## 7. Explicit Non-Goals

The following are explicitly NOT addressed by this remediation plan:

1. **New Feature Development**: No new modules, routes, or capabilities
2. **Permission Matrix Changes**: The permission grants in DOC-014 are not changed
3. **Role Definition Changes**: The 10 canonical roles remain unchanged
4. **UI Redesign**: Beyond permission-based filtering, no UI changes
5. **Performance Optimization**: Authorization logic changes are for correctness, not speed
6. **Legacy Data Migration**: Existing data remains; only RBAC metadata migrates
7. **Third-Party Integrations**: No external system changes

---

## 8. Go/No-Go Gate

### 8.1 Pre-Deployment Verification

Before any remediation phase deploys to production:

| Gate | Verification Method | Required Result |
|------|---------------------|-----------------|
| **G-001** | Run authorization test suite | 100% pass |
| **G-002** | Run CC-001 through CC-015 checklist | All checked |
| **G-003** | Verify no hardcoded role arrays | `grep -r "RBAC.*ROLES\|checkAdminAccess" src/` returns zero |
| **G-004** | Verify single engine usage | All routes use `requirePermission()` |
| **G-005** | Verify Visibility Grant removal | `grep -r "VisibilityGrant\|visibilityGrant" src/ prisma/` returns zero |
| **G-006** | Verify single role per user | DB query: `SELECT user_id FROM UserRole GROUP BY user_id HAVING COUNT(*) > 1` returns zero rows |
| **G-007** | Verify Agent database integration | `AGENT_MODULE_PERMISSIONS` constant does not exist |
| **G-008** | Build & Compilation Verification: Full production build (`pnpm build` / `npm run build` / `next build` — project default) | Build completes successfully; Zero TypeScript errors; Zero authorization-related warnings; No implicit `any`, fallback roles, or default-permission paths introduced; Authorization-related files are included in compiled output and not tree-shaken or bypassed. **This gate is mandatory and blocking.** |

### 8.2 Rollback Triggers

Immediate rollback if:
- Any authorization bypass discovered post-deployment
- Any user reports unexpected access denial to previously-accessible data
- Any CRITICAL severity regression

---

## 9. Quality Guarantees

### 9.1 Zero-Regression Enforcement

**Guarantee:** No user loses access to data they legitimately should access.

**Enforcement:**
1. Before each phase: snapshot current effective permissions for all users
2. After each phase: compare effective permissions
3. Any reduction in legitimate access requires explicit approval

### 9.2 Quality Gates

Each phase MUST pass before next phase begins:

| Phase | Gate |
|-------|------|
| Phase 0 | G-001, G-002 |
| Phase 1 | G-001, G-002, G-005 |
| Phase 2 | G-001, G-002, G-006 |
| Phase 3 | G-001, G-002, G-003, G-004 |
| Phase 4 | G-001, G-002, G-007 |

### 9.3 Build Verification

Every PR in remediation scope MUST:
1. Pass existing test suite
2. Include authorization-specific tests for changed routes
3. Be reviewed against DOC-016 compliance checklist
4. Not introduce any new forbidden patterns

### 9.4 Lock Condition ("Once and For All")

Upon completion of all phases:

1. **Constitutional Lock**: No code change touching authorization may proceed without DOC-016 compliance verification
2. **Review Requirement**: All authorization-related PRs require review against CC-001 through CC-015
3. **Forbidden Pattern Scanner**: CI must include scanner for FP-001 through FP-010
4. **Single Engine Mandate**: New routes MUST use V2 engine; no exceptions

---

## 10. Appendix: Code Location Reference

### 10.1 Files Requiring Modification

| File | Phase | Changes Required |
|------|-------|------------------|
| `src/lib/permissions.ts` | 1, 3 | Remove VG checks, add MAIN_PAGE scope |
| `src/lib/authorization.ts` | 1, 3 | Remove VG checks, deprecate |
| `src/lib/agent-response.ts` | 4 | Remove hardcoded matrix |
| `src/lib/auth.ts` | 2 | Single role loading |
| `src/app/api/upload/route.ts` | 0 | Add authorization check |
| `src/app/api/agent/route.ts` | 0, 4 | Fix role default, use DB permissions |
| `src/app/api/organizations/route.ts` | 0 | Add authorization check |
| `src/app/api/projects/[id]/events/route.ts` | 0 | Add GET authorization |
| `src/app/api/admin/users/route.ts` | 3 | Replace blanket check |
| `src/app/api/admin/users/[id]/route.ts` | 3 | Replace blanket check |
| `prisma/schema.prisma` | 1, 2 | Drop VG table, add role constraint |
| `src/components/Sidebar.tsx` | 3 | Replace hardcoded array |

### 10.2 Files to Delete/Deprecate

| File | Phase | Reason |
|------|-------|--------|
| `src/lib/authorization.ts` | 3 | Replaced by V2 engine |
| Visibility Grant related code | 1 | Rejected pattern per FP-006 |

---

## 11. Sign-Off

This remediation plan requires approval before implementation begins.

| Role | Name | Approval | Date |
|------|------|----------|------|
| Engineering Lead | | [ ] Approved | |
| Product Owner | | [ ] Approved | |
| CTO | | [ ] Approved | |

---

## Version History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-02-02 | Claude (Diagnostic Audit) | Initial remediation plan based on DOC-016 compliance audit |

---

End of Document
