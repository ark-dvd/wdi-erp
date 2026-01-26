# RBAC v2 Implementation Plan

**Document Type**: Technical Implementation Guide
**Canon Reference**: DOC-013 v2.0, DOC-014 v2.0
**Created**: 2026-01-26
**Status**: Draft for Review
**Version**: 2.0

---

## 1. Summary of Changes from v1

### 1.1 Key Changes

| Area | v1 (DOC-013 v1.1) | v2 (DOC-013 v2.0) |
|------|-------------------|-------------------|
| Role count | 9 | 10 |
| Role model | Multi-role (union-of-allows) | **Single role per user** |
| Module count | 11 | 11 (different set) |
| Visibility Grants | Separate mechanism | **Removed** (built into roles) |
| All Employees | Always added to other roles | **Temporary** (replaced) |
| org_directory | Separate module | **Merged into hr** |
| documents | Separate module | **Removed** (per-entity) |
| contacts | Part of vendors | **Separate module** |
| financial | Not defined | **New placeholder module** |

### 1.2 Role Mapping (Old → New)

| v1 Role | v2 Role | Notes |
|---------|---------|-------|
| owner | owner | Unchanged |
| executive | executive | Unchanged |
| trust_officer | trust_officer | Unchanged |
| — | **pmo** | **NEW** |
| finance_officer | finance_officer | Different permissions |
| domain_head | domain_head | Unchanged |
| senior_pm | **project_manager** | **RENAMED** |
| project_coordinator | project_coordinator | Unchanged |
| operations_staff | **administration** | **RENAMED + different permissions** |
| all_employees | all_employees | Now temporary, not additive |

---

## 2. Current Codebase Status

### 2.1 Where Auth Currently Lives

| Component | Location | Description |
|-----------|----------|-------------|
| NextAuth Configuration | `src/lib/auth.ts` | Google OAuth provider, session enrichment |
| Auth Route Handler | `src/app/api/auth/[...nextauth]/route.ts` | Pass-through to NextAuth handlers |
| Session Extension | `src/lib/auth.ts` | Custom session with role, permissions |

### 2.2 Current Session Structure

```typescript
session.user = {
  id: string,
  role: string,              // Single role name
  roleDisplayName: string,   // Hebrew display name
  employeeId: string | null,
  employeeName: string,
  employeePhoto: string | null,
  permissions: string[]      // Flattened as "module:action" format
}
```

**Good News**: Current implementation already uses single-role model (matches v2).

---

## 3. Gap Analysis (v2)

### 3.1 Critical Gaps

| Gap ID | Description | Severity |
|--------|-------------|----------|
| G-001 | Wrong role names in database seed | **CRITICAL** |
| G-002 | Missing PMO role | **CRITICAL** |
| G-003 | Missing contacts module | **HIGH** |
| G-004 | Missing financial module (placeholder) | **MEDIUM** |
| G-005 | org_directory still separate from hr | **HIGH** |
| G-006 | Visibility Grants code exists (should remove) | **MEDIUM** |
| G-007 | API routes use hardcoded role arrays | **HIGH** |
| G-008 | documents module exists (should remove) | **MEDIUM** |

### 3.2 What's Already Correct

| Component | Status |
|-----------|--------|
| Single role per user | ✅ Already implemented |
| Server-side auth | ✅ Already implemented |
| Audit logging structure | ✅ Exists (ActivityLog) |
| Basic permission model | ✅ Exists (needs update) |

---

## 4. Database Schema Changes

### 4.1 Role Table Update

**Current roles in seed**:
```
founder, executive, trust_officer, finance_officer, domain_head, 
senior_pm, project_coordinator, operations_staff, employee
```

**Required roles (v2)**:
```
owner, executive, trust_officer, pmo, finance_officer, 
domain_head, project_manager, project_coordinator, administration, all_employees
```

**Migration**:
```sql
-- Rename existing roles
UPDATE "Role" SET name = 'owner' WHERE name = 'founder';
UPDATE "Role" SET name = 'project_manager' WHERE name = 'senior_pm';
UPDATE "Role" SET name = 'administration' WHERE name = 'operations_staff';
UPDATE "Role" SET name = 'all_employees' WHERE name = 'employee';

-- Add new role
INSERT INTO "Role" (id, name, displayName) 
VALUES (gen_random_uuid(), 'pmo', 'PMO');
```

### 4.2 Permission Table Update

Current permission format: `module:action`

Required permission format: `module:action:scope`

**Example permissions for project_manager**:
```
projects:read:all
projects:update:assigned
projects:create:assigned
hr:read:main_page
hr:read:self
hr:update:self
events:read:all
events:update:assigned
events:create:assigned
events:delete:own
equipment:read:own
equipment:update:own
vehicles:read:own
vehicles:update:own
vendors:read:all
vendors:update:all
vendors:create:all
vendors:delete:all
contacts:read:all
contacts:update:all
contacts:create:all
contacts:delete:all
knowledge_repository:read:all
agent:query:all
```

### 4.3 Tables to Add/Modify

| Table | Action | Notes |
|-------|--------|-------|
| Role | UPDATE | Rename + add PMO |
| Permission | UPDATE | Add scope, update permissions |
| Contact | CREATE | New entity for contacts module |
| Financial* | DEFER | Placeholder module |

### 4.4 Tables to Remove/Deprecate

| Table | Action | Notes |
|-------|--------|-------|
| VisibilityGrant | REMOVE | Mechanism eliminated |
| OrgDirectory* | MERGE | Merge into Employee/HR |

---

## 5. Implementation Phases

### Phase 1: Role Name Alignment (Low Risk)

**Objective**: Align database role names with canonical v2 names.

**Steps**:
1. Create migration script for role renames
2. Add PMO role to seed
3. Update displayName values (Hebrew)
4. Run migration
5. Verify all users still have valid roles

**Risk**: Low (names only, no permission changes)

**Rollback**: Simple SQL to revert names

---

### Phase 2: Permission Matrix Update (Medium Risk)

**Objective**: Update all permission grants to match DOC-014 v2.0.

**Steps**:
1. Export current permission state (backup)
2. Create new permission seed based on DOC-014
3. Update RolePermission junction table
4. Add scope field to Permission model if needed
5. Test each role's effective permissions

**Risk**: Medium (changes what users can do)

**Rollback**: Restore from backup

---

### Phase 3: Module Consolidation (High Risk)

**Objective**: Merge org_directory into hr, remove documents module.

**Steps**:
1. Update hr module to include main_page vs card distinction
2. Create HR field visibility based on scope
3. Remove org_directory references from code
4. Update all API routes
5. Remove documents module references
6. Ensure document access follows parent entity

**Risk**: High (affects data access patterns)

**Rollback**: Feature flag to revert

---

### Phase 4: Contacts Module (Medium Risk)

**Objective**: Create standalone contacts module.

**Steps**:
1. Create Contact model in Prisma
2. Create contacts API routes
3. Implement permissions per DOC-014
4. Add UI for contacts module
5. Migrate existing contact data if any

**Risk**: Medium (new feature)

**Rollback**: Remove module

---

### Phase 5: Remove Visibility Grants (Low Risk)

**Objective**: Remove Visibility Grants mechanism.

**Steps**:
1. Remove VisibilityGrant table
2. Remove grant-related API routes
3. Remove grant-related UI
4. Update permission evaluation to not check grants
5. Document that read scope is built into role

**Risk**: Low (simplification)

**Rollback**: Restore table and code

---

### Phase 6: Financial Module Placeholder (Low Risk)

**Objective**: Create placeholder for financial module.

**Steps**:
1. Add financial module to module enum
2. Add basic permissions structure
3. Add placeholder UI (coming soon)
4. No actual implementation

**Risk**: Low (placeholder only)

---

## 6. Authorization Evaluation Algorithm

### 6.1 v2 Permission Check

```typescript
async function checkPermission(
  userId: string,
  module: string,
  operation: 'read' | 'update' | 'create' | 'delete',
  targetEntity?: { id: string; scope?: string }
): Promise<boolean> {
  
  // 1. Get user's role
  const user = await getUser(userId);
  if (!user.roleId) return false;
  
  // 2. Get role's permissions for this module+operation
  const permission = await getPermission(user.roleId, module, operation);
  if (!permission) return false;
  
  // 3. Evaluate scope
  switch (permission.scope) {
    case 'all':
      return true;
      
    case 'domain':
      return await isInUserDomain(userId, targetEntity);
      
    case 'assigned':
      return await isAssignedToUser(userId, targetEntity);
      
    case 'own':
      return await isOwnedByUser(userId, targetEntity);
      
    case 'self':
      return targetEntity?.id === userId;
      
    case 'main_page':
      return operation === 'read' && !targetEntity?.id; // List only
      
    case 'contacts':
      return await isContactsSection(targetEntity);
      
    default:
      return false;
  }
}
```

### 6.2 Agent Access Check

```typescript
async function checkAgentAccess(
  userId: string,
  module: string,
  targetEntity?: { id: string }
): Promise<boolean> {
  // Agent only gets READ access within user's permissions
  return checkPermission(userId, module, 'read', targetEntity);
}
```

---

## 7. API Route Update Pattern

### 7.1 Current Pattern (Problematic)

```typescript
// Current: Hardcoded role arrays
const allowedRoles = ['founder', 'executive', 'trust_officer'];
if (!allowedRoles.includes(session.user.role)) {
  return new Response('Forbidden', { status: 403 });
}
```

### 7.2 Required Pattern

```typescript
// Required: Permission-based check
const authorized = await checkPermission(
  session.user.id,
  'projects',
  'update',
  { id: projectId }
);
if (!authorized) {
  return new Response('אין לך הרשאה לבצע פעולה זו', { status: 403 });
}
```

---

## 8. Testing Strategy

### 8.1 Role Permission Tests

For each role, test:
- [ ] Can access expected modules
- [ ] Cannot access restricted modules
- [ ] Scope limits work correctly
- [ ] Agent follows same permissions

### 8.2 Regression Tests

- [ ] Existing users retain appropriate access
- [ ] No data exposure beyond permissions
- [ ] Audit logs capture all auth events
- [ ] UI hides unauthorized actions

---

## 9. Migration Checklist

### Pre-Migration

- [ ] Backup database
- [ ] Document current role assignments
- [ ] Export current permissions
- [ ] Notify stakeholders

### During Migration

- [ ] Run role rename migration
- [ ] Add PMO role
- [ ] Update permission grants
- [ ] Consolidate modules
- [ ] Remove Visibility Grants
- [ ] Add contacts module

### Post-Migration

- [ ] Verify all users have valid roles
- [ ] Test each role's permissions
- [ ] Verify Agent access matches expectations
- [ ] Run full regression suite
- [ ] Update user documentation

---

## 10. Rollback Plan

### Database Rollback

```sql
-- Save rollback point
CREATE TABLE rbac_backup AS SELECT * FROM "Role";
CREATE TABLE permissions_backup AS SELECT * FROM "Permission";
CREATE TABLE role_permissions_backup AS SELECT * FROM "RolePermission";
```

### Code Rollback

- All changes behind feature flag: `RBAC_V2_ENABLED`
- If flag is false, use v1 logic
- Gradual rollout per environment

---

## Version History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-25 | Claude | Initial plan based on DOC-013 v1.1 |
| 2.0 | 2026-01-26 | Claude | Complete rewrite for DOC-013 v2.0: single-role model, simplified modules, removed Visibility Grants |

---

End of Document
