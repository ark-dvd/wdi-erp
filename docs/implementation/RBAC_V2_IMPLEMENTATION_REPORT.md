# RBAC v2 Implementation Report

**Document Type**: Implementation Analysis Report
**Canon Reference**: DOC-013 v2.0, DOC-014 v2.0
**Generated**: 2026-01-26
**Status**: Ready for Review
**Author**: Claude (Opus 4.5)

---

## 4.1 Summary of Understanding

### 4.1.1 RBAC v2 Overview

RBAC v2 represents a significant simplification of the authorization model, moving from a multi-role union-of-allows system to a **single-role-per-user** model. This change reduces complexity and makes permission evaluation deterministic.

### 4.1.2 Canonical Roles (10 Total)

| # | Role Name | Hebrew Display | Level | Description |
|---|-----------|----------------|-------|-------------|
| 1 | `owner` | בעלים | 1 | Full system access, no restrictions |
| 2 | `executive` | מנכ"ל | 2 | Full operational access |
| 3 | `trust_officer` | נאמן משרד | 3 | HR management, RBAC administration |
| 4 | `pmo` | PMO | 4 | **NEW** - Project management office |
| 5 | `finance_officer` | מנהל כספים | 5 | Financial oversight |
| 6 | `domain_head` | ראש תחום | 6 | Domain-scoped management |
| 7 | `project_manager` | מנהל פרויקט | 7 | **RENAMED** from `senior_pm` |
| 8 | `project_coordinator` | רכז פרויקט | 8 | Project coordination |
| 9 | `administration` | מזכירות | 9 | **RENAMED** from `operations_staff` |
| 10 | `all_employees` | כל העובדים | 100 | **TEMPORARY** - Base access |

### 4.1.3 Canonical Modules (11 Total)

| # | Module | Hebrew Label | Status |
|---|--------|--------------|--------|
| 1 | `events` | יומן אירועים | Active |
| 2 | `projects` | פרויקטים | Active |
| 3 | `hr` | משאבי אנוש | Active (absorbs org_directory) |
| 4 | `contacts` | אנשי קשר | **NEW** (extracted from vendors) |
| 5 | `vendors` | ספקים | Active |
| 6 | `equipment` | ציוד | Active |
| 7 | `vehicles` | רכבים | Active |
| 8 | `knowledge_repository` | מאגר מידע | Active |
| 9 | `financial` | פיננסי | **NEW PLACEHOLDER** |
| 10 | `agent` | WDI Agent | Active |
| 11 | `admin` | ניהול מערכת | Active |

### 4.1.4 Key Scope Types

| Scope Code | Full Name | Description |
|------------|-----------|-------------|
| ALL | All | Unrestricted access to all records |
| D | Domain | Records within assigned domain(s) |
| A | Assigned | Records where user is explicitly assigned |
| O | Own | Records created by the user |
| S | Self | User's own employee/profile record only |
| MP | Main Page | Read-only access to list view (no detail cards) |
| C | Contacts | Access limited to contact information section |

### 4.1.5 Critical Model Changes (v1 → v2)

| Aspect | RBAC v1 | RBAC v2 |
|--------|---------|---------|
| **Role Assignment** | Multi-role (union-of-allows) | **Single role per user** |
| **Permission Resolution** | Broadest scope from all roles | Single role's exact permissions |
| **all_employees** | Always additive to other roles | **Temporary** (should be replaced) |
| **Visibility Grants** | Separate mechanism for project read access | **REMOVED** (built into scopes) |
| **org_directory** | Separate module | **Merged into hr** (main_page vs card) |
| **documents** | Separate module | **REMOVED** (access via parent entity) |
| **contacts** | Part of vendors | **Separate module** |
| **financial** | Not defined | **New placeholder** |

---

## 4.2 Gap Analysis

### 4.2.1 Critical Gaps (Must Fix Before Go-Live)

| Gap ID | Component | Current State | Required State | Severity | Impact |
|--------|-----------|---------------|----------------|----------|--------|
| **G-001** | `prisma/seed.ts` | `senior_pm` role | `project_manager` | **CRITICAL** | Auth fails for renamed role |
| **G-002** | `prisma/seed.ts` | `operations_staff` role | `administration` | **CRITICAL** | Auth fails for renamed role |
| **G-003** | `prisma/seed.ts` | Missing PMO role | `pmo` role required | **CRITICAL** | New role cannot be assigned |
| **G-004** | `src/lib/auth.ts` | Multi-role loading | Single role loading | **CRITICAL** | Wrong permission resolution |
| **G-005** | `src/lib/authorization.ts` | `CanonicalRole` type has v1 names | Update to v2 names | **CRITICAL** | TypeScript errors |

### 4.2.2 High Priority Gaps

| Gap ID | Component | Current State | Required State | Severity | Impact |
|--------|-----------|---------------|----------------|----------|--------|
| **G-006** | `src/lib/authorization.ts` | `Module` type has `org_directory`, `documents` | Remove `org_directory`, `documents`; Add `contacts`, `financial` | **HIGH** | Type mismatches |
| **G-007** | Multiple API routes | Hardcoded role arrays like `['founder', 'executive']` | Permission-based checks | **HIGH** | Broken authorization |
| **G-008** | `prisma/schema.prisma` | `UserRole` junction table (multi-role) | Single `roleId` on User | **HIGH** | Data model mismatch |
| **G-009** | Session type | `roles: []` array | `role: string` single | **HIGH** | Client code breaks |
| **G-010** | Admin pages | Check both `roles` array and `role` string | Check single `role` | **HIGH** | Redundant logic |

### 4.2.3 Medium Priority Gaps

| Gap ID | Component | Current State | Required State | Severity | Impact |
|--------|-----------|---------------|----------------|----------|--------|
| **G-011** | `prisma/schema.prisma` | `VisibilityGrant` model exists | Remove model | **MEDIUM** | Dead code |
| **G-012** | `src/lib/authorization.ts` | `visibilityGrantProjectIds` in context | Remove visibility grant logic | **MEDIUM** | Dead code |
| **G-013** | seed.ts | org_directory permissions | Remove, add hr:main_page scope | **MEDIUM** | Wrong permissions |
| **G-014** | seed.ts | documents module permissions | Remove entirely | **MEDIUM** | Dead permissions |
| **G-015** | API/UI | No contacts module | Create contacts CRUD | **MEDIUM** | Missing feature |
| **G-016** | API/UI | No financial module | Create placeholder | **MEDIUM** | Missing placeholder |

### 4.2.4 Low Priority Gaps

| Gap ID | Component | Current State | Required State | Severity | Impact |
|--------|-----------|---------------|----------------|----------|--------|
| **G-017** | UI constants | Old role names in color schemes | Update to new names | **LOW** | Visual only |
| **G-018** | Hebrew labels | Some inconsistent with v2 docs | Align with DOC-014 | **LOW** | Cosmetic |

### 4.2.5 What's Already Correct

| Component | Status | Notes |
|-----------|--------|-------|
| NextAuth configuration structure | ✅ | Ready for adaptation |
| Session enrichment pattern | ✅ | Works, needs simplification |
| Permission format `module:action:scope` | ✅ | Correct format |
| Activity logging structure | ✅ | Already captures role info |
| Basic auth flow (Google OAuth) | ✅ | No changes needed |
| `level` field on Role model | ✅ | Used for display priority |

---

## 4.3 Recommended Implementation Phases

### Phase 1: Role Name Migration (Severity: LOW RISK)

**Objective**: Align database role names with canonical v2 names without changing behavior.

**Scope**:
- Rename `senior_pm` → `project_manager` in database
- Rename `operations_staff` → `administration` in database
- Add `pmo` role to database
- Update displayName values (Hebrew)

**Files to Modify**:
```
prisma/seed.ts
├── CANONICAL_ROLES array (rename entries)
├── Add PMO role definition
└── Update LEGACY_TO_CANONICAL_MAP
```

**SQL Migration**:
```sql
-- Phase 1a: Rename roles
UPDATE "Role" SET name = 'project_manager' WHERE name = 'senior_pm';
UPDATE "Role" SET name = 'administration' WHERE name = 'operations_staff';

-- Phase 1b: Add PMO role
INSERT INTO "Role" (id, name, "displayName", description, level)
VALUES (gen_random_uuid(), 'pmo', 'PMO', 'Project Management Office', 4);
```

**Rollback**:
```sql
UPDATE "Role" SET name = 'senior_pm' WHERE name = 'project_manager';
UPDATE "Role" SET name = 'operations_staff' WHERE name = 'administration';
DELETE FROM "Role" WHERE name = 'pmo';
```

**Tests**:
- [ ] All existing users retain valid roles
- [ ] Role lookup by name works
- [ ] Admin UI displays correct Hebrew names

---

### Phase 2: Single-Role Model Migration (Severity: HIGH RISK)

**Objective**: Change from multi-role to single-role-per-user.

**Scope**:
- Add `roleId` direct FK on User model
- Migrate data from UserRole junction to direct FK
- Remove multi-role loading from auth.ts
- Update session type to single role

**Prisma Schema Change**:
```prisma
model User {
  // ... existing fields
  roleId    String?       // NEW: Direct FK to Role
  role      Role?         @relation(fields: [roleId], references: [id])

  // DEPRECATED: Keep temporarily for migration
  roles     UserRole[]    // Mark for removal in Phase 2b
}
```

**Data Migration Strategy**:
1. For each user with multiple roles, keep the highest-privilege role (lowest level)
2. Populate `roleId` with that role's ID
3. After verification, remove UserRole entries

**Files to Modify**:
```
prisma/schema.prisma
├── Add roleId to User model
└── Keep UserRole temporarily

src/lib/auth.ts
├── Change session.user.roles to session.user.role
├── Load single role instead of array
└── Simplify permission loading

src/lib/authorization.ts
├── Update CanonicalRole type
├── Update UserAuthContext interface
└── Simplify evaluateAuthorization

src/app/dashboard/admin/users/page.tsx
├── Update RBAC check to single role
└── Update user display

src/app/dashboard/admin/roles/[name]/page.tsx
├── Update RBAC_ADMIN_ROLES check
└── Update roleColorSchemes keys
```

**Rollback**:
- Keep UserRole junction table populated during transition
- Feature flag: `RBAC_V2_SINGLE_ROLE=true/false`
- If false, use old multi-role logic

**Tests**:
- [ ] User with owner role can access admin
- [ ] User with trust_officer can access admin
- [ ] User with all_employees cannot access admin
- [ ] Permission evaluation returns correct scope
- [ ] Session contains single role, not array

---

### Phase 3: Permission Matrix Update (Severity: MEDIUM RISK)

**Objective**: Update permission grants to match DOC-014 v2.0 exactly.

**Scope**:
- Update PERMISSION_MATRIX in seed.ts to v2 specification
- Add new scopes (main_page, contacts)
- Remove org_directory and documents module permissions
- Add hr scope differentiation (main_page vs card vs self)

**Key Permission Changes**:

| Role | Module | v1 | v2 |
|------|--------|----|----|
| domain_head | hr | READ:DOMAIN (metadata) | READ:main_page |
| project_manager | hr | READ:PROJECT (metadata) | READ:main_page |
| project_coordinator | hr | READ:SELF | READ:main_page, UPDATE:self |
| administration | hr | READ:SELF | READ:main_page, UPDATE:self |
| project_manager | vendors | READ:ALL | READ:all, UPDATE:all, CREATE:all, DELETE:all |

**Files to Modify**:
```
prisma/seed.ts
├── Complete rewrite of PERMISSION_MATRIX
├── Add contacts module permissions
├── Add financial placeholder permissions
└── Remove org_directory, documents permissions
```

**Rollback**:
- Export current RolePermission table before migration
- Script to restore from export if needed

**Tests**:
- [ ] Each role has exact permissions per DOC-014 tables
- [ ] No orphaned permissions exist
- [ ] All 10 roles have permission entries

---

### Phase 4: Module Consolidation (Severity: MEDIUM RISK)

**Objective**: Merge org_directory into hr, remove documents module.

**Scope**:
- Remove org_directory module references from code
- Add main_page vs card distinction to hr module
- Remove documents module references
- Update API routes to follow parent entity for documents

**Files to Modify**:
```
src/lib/authorization.ts
├── Remove 'org_directory' from Module type
├── Remove 'documents' from Module type
├── Add 'contacts' to Module type
├── Add 'financial' to Module type

src/app/dashboard/admin/roles/[name]/page.tsx
├── Update CANONICAL_MODULES constant
└── Remove org_directory and documents entries

Multiple API routes
├── Remove org_directory route handlers (if any)
├── Update hr route to handle main_page scope
└── Remove documents route handlers (if any)
```

**Rollback**:
- Feature flag: `RBAC_V2_MODULES=true/false`
- Keep old module constants available

**Tests**:
- [ ] HR main page shows directory-style list
- [ ] HR card page respects scope restrictions
- [ ] No 404s for org_directory routes
- [ ] Document access works via parent entity

---

### Phase 5: Remove Visibility Grants (Severity: LOW RISK)

**Objective**: Remove the Visibility Grants mechanism entirely.

**Scope**:
- Remove VisibilityGrant model from schema
- Remove visibility grant loading from auth context
- Remove visibility grant API routes
- Remove visibility grant UI components

**Files to Modify**:
```
prisma/schema.prisma
├── Remove VisibilityGrant model
└── Remove visibilityGrantsReceived relation from User

src/lib/authorization.ts
├── Remove visibilityGrantProjectIds from UserAuthContext
├── Remove isVisibilityGrantAllowed function
└── Update checkEntityWithinScope for PROJECT scope

src/lib/auth.ts
└── Remove visibility grant loading (if any)

API routes (find and remove)
├── Any /api/visibility-grants routes
└── Any grant-related endpoints
```

**Rollback**:
- Keep VisibilityGrant table data (soft delete via migration)
- Can restore model definition if needed

**Tests**:
- [ ] PROJECT scope works without visibility grants
- [ ] No runtime errors from missing visibility grant code
- [ ] Admin UI doesn't show grant management (if it existed)

---

### Phase 6: New Module Scaffolding (Severity: LOW RISK)

**Objective**: Create contacts module and financial placeholder.

**Scope**:
- Create Contact model in Prisma (if not exists)
- Create contacts API routes
- Create contacts UI pages
- Create financial placeholder page

**Files to Create**:
```
prisma/schema.prisma (if Contact doesn't exist)
└── Contact model definition

src/app/api/contacts/route.ts
├── GET (list)
├── POST (create)

src/app/api/contacts/[id]/route.ts
├── GET (single)
├── PUT (update)
├── DELETE (delete)

src/app/dashboard/contacts/page.tsx
└── Contacts list page

src/app/dashboard/financial/page.tsx
└── "Coming Soon" placeholder
```

**Tests**:
- [ ] Contacts CRUD respects role permissions
- [ ] Financial page renders placeholder
- [ ] Navigation includes both modules

---

## 4.4 Risk Assessment

### 4.4.1 Breaking Changes

| Change | Risk Level | Affected Areas | Mitigation |
|--------|------------|----------------|------------|
| Role rename (`senior_pm` → `project_manager`) | **HIGH** | Any code checking role names | Database migration + code search/replace |
| Role rename (`operations_staff` → `administration`) | **HIGH** | Any code checking role names | Database migration + code search/replace |
| Multi-role → Single-role | **VERY HIGH** | Session structure, auth checks, UI | Feature flag, gradual rollout |
| Remove UserRole junction | **HIGH** | All role assignment logic | Keep junction during transition |
| Remove VisibilityGrant | **MEDIUM** | Project read access for non-assigned | Verify scope logic handles cases |
| Remove org_directory module | **MEDIUM** | Any org_directory routes/UI | Redirect or remove |
| Remove documents module | **MEDIUM** | Document access patterns | Ensure parent-entity access works |

### 4.4.2 Data Migration Risks

| Migration | Risk | Data Loss Potential | Mitigation |
|-----------|------|---------------------|------------|
| Role renames | LOW | None (rename only) | Reversible SQL |
| Multi-role to single-role | **HIGH** | Users lose secondary roles | Document affected users, manual review |
| Permission matrix update | MEDIUM | Old permissions lost | Full backup before migration |
| Remove VisibilityGrant | LOW | Grant history lost | Archive table before deletion |

### 4.4.3 Testing Requirements

**Unit Tests Required**:
- [ ] `checkPermission()` returns correct result for each role/module/operation combination
- [ ] Scope evaluation (ALL, DOMAIN, ASSIGNED, OWN, SELF, MAIN_PAGE) works correctly
- [ ] Admin access check works for owner and trust_officer only
- [ ] Agent access respects user's read permissions

**Integration Tests Required**:
- [ ] User login populates session with correct single role
- [ ] API routes enforce permissions correctly
- [ ] UI shows/hides elements based on permissions
- [ ] Role assignment via admin UI works

**Manual Testing Matrix**:

| Role | Should Access | Should NOT Access |
|------|--------------|-------------------|
| owner | Everything | Nothing restricted |
| executive | All operational | RBAC admin (modification) |
| trust_officer | HR, Admin, all modules | Owner permissions modification |
| pmo | Projects (all), HR (main_page) | HR cards, Admin |
| finance_officer | Financial data, projects | HR sensitive, Admin |
| domain_head | Domain-scoped resources | Other domains, Admin |
| project_manager | Assigned projects, vendors, contacts | Other projects, HR cards, Admin |
| project_coordinator | Assigned projects (limited) | Unassigned projects, Admin |
| administration | Own events, HR self | Other users' data, Admin |
| all_employees | Read-only basics, self HR | Write operations, Admin |

### 4.4.4 Rollback Capabilities

| Phase | Rollback Method | Time to Rollback |
|-------|-----------------|------------------|
| Phase 1 (Role names) | SQL UPDATE/DELETE | < 5 minutes |
| Phase 2 (Single-role) | Feature flag | Instant |
| Phase 3 (Permissions) | Restore from backup | 15-30 minutes |
| Phase 4 (Modules) | Feature flag + code revert | < 10 minutes |
| Phase 5 (Visibility Grants) | Restore model + data | 30 minutes |
| Phase 6 (New modules) | Remove routes/pages | < 10 minutes |

---

## 4.5 Questions and Clarifications

### 4.5.1 Clarification Needed

1. **all_employees as Temporary Role**
   - DOC-013 v2.0 states all_employees is "temporary" and should be replaced within hours/days
   - **Question**: Should we build a workflow to prompt admins to assign a permanent role?
   - **Question**: What happens if a user remains as all_employees indefinitely?

2. **PMO Role Permissions**
   - DOC-014 v2.0 shows PMO has broad project access but limited HR access
   - **Question**: Should PMO have hr:read:main_page or hr:read:contacts scope?
   - **Question**: Does PMO need access to the admin module for reporting?

3. **HR Main Page vs Card Distinction**
   - v2 introduces "main_page" scope for HR (directory listing) vs full card access
   - **Question**: Is main_page meant to show the employee list page only, or a simplified card view?
   - **Question**: What specific fields are visible in main_page vs card scope?

4. **Contacts Module Scope**
   - Contacts is now a separate module extracted from vendors
   - **Question**: Is Contact data specific to vendors, or organization-wide contacts?
   - **Question**: Should contacts have their own database model or reference other entities?

5. **Financial Module Implementation**
   - DOC-013 describes financial as a "placeholder" module
   - **Question**: What minimal functionality should the placeholder have?
   - **Question**: Is there a timeline for full financial module implementation?

6. **Document Access via Parent Entity**
   - DOC-013 removes the documents module; access follows parent entity
   - **Question**: What entities can have documents? (Projects, Employees, Vendors, Equipment, Vehicles?)
   - **Question**: Does the permission check cascade from parent or is it separate?

### 4.5.2 Assumptions Made

1. **Single Role Selection**: When migrating from multi-role to single-role, we assume the highest-privilege role (lowest level number) should be kept.

2. **Backward Compatibility**: We assume a feature flag approach is acceptable for gradual rollout.

3. **Session Structure**: We assume changing `session.user.roles[]` to `session.user.role` is acceptable and all client code will be updated.

4. **No External Integrations**: We assume no external systems depend on the current role names or multi-role model.

5. **Permission Format**: We assume `module:action:scope` format remains correct for v2.

### 4.5.3 Recommendations

1. **Phased Rollout**: Implement changes in the order specified (Phase 1-6) with verification gates between phases.

2. **Feature Flags**: Use environment variables to toggle v1/v2 behavior during transition:
   ```
   RBAC_VERSION=v1|v2
   RBAC_SINGLE_ROLE_ENABLED=true|false
   RBAC_V2_MODULES_ENABLED=true|false
   ```

3. **Audit Trail**: Before each migration phase, export current state to a backup table:
   ```sql
   CREATE TABLE rbac_backup_YYYYMMDD AS SELECT * FROM "Role";
   CREATE TABLE permissions_backup_YYYYMMDD AS SELECT * FROM "Permission";
   CREATE TABLE user_roles_backup_YYYYMMDD AS SELECT * FROM "UserRole";
   ```

4. **Communication**: Notify all users before Phase 2 (single-role migration) as their effective permissions may change.

5. **Testing Environment**: Run full migration in staging environment before production.

---

## Version History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-26 | Claude (Opus 4.5) | Initial implementation report based on DOC-013 v2.0 and DOC-014 v2.0 |

---

**End of Report**

*This report is ready for review. No code modifications have been made. Implementation should proceed only after stakeholder approval.*
