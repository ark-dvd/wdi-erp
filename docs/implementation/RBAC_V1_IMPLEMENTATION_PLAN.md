# RBAC v1 Implementation Plan

**Document Type**: Technical Implementation Guide
**Canon Reference**: DOC-013 (RBAC Authorization Matrix & Operational Policy v1.1), DOC-014 (RBAC Authorization Matrix v1.0)
**Created**: 2026-01-25
**Status**: Draft for Review

---

## 1. Repository Baseline Findings

### 1.1 Where Auth Currently Lives

| Component | Location | Description |
|-----------|----------|-------------|
| NextAuth Configuration | `src/lib/auth.ts` | Google OAuth provider, session enrichment with user/role/permissions |
| Auth Route Handler | `src/app/api/auth/[...nextauth]/route.ts` | Pass-through to NextAuth handlers |
| Session Extension | `src/lib/auth.ts:111-126` | Custom session interface with role, permissions array |
| Middleware | **NONE** | No custom middleware exists; all auth checks happen inside route handlers |

**Current Session Data Structure** (from `src/lib/auth.ts:63-96`):
```typescript
session.user = {
  id: string,
  role: string,              // Single role name (e.g., 'founder')
  roleDisplayName: string,   // Hebrew display name
  employeeId: string | null,
  employeeName: string,
  employeePhoto: string | null,
  permissions: string[]      // Flattened as "module:action" format
}
```

**Critical Finding**: Session includes `permissions` array but API routes do NOT use it; they check hardcoded role arrays instead.

### 1.2 Existing RBAC Artifacts

| Artifact | Location | Status vs Canon |
|----------|----------|-----------------|
| Role Seed | `prisma/seed.ts:57-69` | **MISMATCHED** - 7 roles vs DOC-013's 9 roles |
| Permission Seed | `prisma/seed.ts:26-53` | **MISMATCHED** - modules don't match DOC-013 §6.1 |
| Module Permissions | `src/lib/agent-response.ts:299-341` | **MISMATCHED** - uses ADMIN/MANAGER/USER, not canon roles |
| API Role Arrays | Various API routes | **SCATTERED** - hardcoded arrays like `PROJECTS_WRITE_ROLES`, `SENSITIVE_DATA_ROLES` |

**Seed Roles (Current)**:
- `founder`, `ceo`, `office_manager`, `department_manager`, `project_manager`, `secretary`, `employee`

**Canon Roles (DOC-013 §4.1)**:
- `owner`, `executive`, `trust_officer`, `finance_officer`, `domain_head`, `senior_pm`, `project_coordinator`, `operations_staff`, `all_employees`

### 1.3 Current Data Model Tables Relevant to Auth

**File**: `prisma/schema.prisma`

| Table | Lines | Canon Alignment |
|-------|-------|-----------------|
| `User` | 22-49 | ❌ Single `roleId` - DOC-013 requires multi-role support |
| `Role` | 51-59 | ⚠️ Structure OK, but content mismatched (wrong role names) |
| `Permission` | 61-70 | ❌ Missing `scope` field - DOC-013 requires `module:operation:scope` |
| `RolePermission` | 72-81 | ⚠️ Junction table OK, but no scope handling |
| `AllowedDomain` | 83-88 | ✅ Email domain whitelist - unrelated to RBAC scope |
| `Employee` | 92-143 | ⚠️ Has `department` field but no formal Domain model |
| `ActivityLog` | 746-771 | ✅ Audit trail exists, needs RBAC events alignment |

**Missing Tables Required by DOC-013**:
1. `UserRole` - Junction table for multi-role assignment
2. `Domain` - Functional domain definitions
3. `UserDomainAssignment` - User-to-domain mapping for DOMAIN scope
4. `VisibilityGrant` - Per DOC-013 §8 specification
5. (Implicit) `ProjectAssignment` - Exists via `ProjectManager` and `ProjectCoordinator` but needs unification

### 1.4 Current Gaps vs DOC-013/014

| Gap ID | Description | Canon Reference | Severity |
|--------|-------------|-----------------|----------|
| G-001 | Wrong role names in seed/database | DOC-013 §4.1 | **CRITICAL** |
| G-002 | Single role per user (no multi-role) | DOC-013 §3.2 (union-of-allows) | **CRITICAL** |
| G-003 | No scope dimension in Permission model | DOC-013 §5, DOC-014 §2.1 | **CRITICAL** |
| G-004 | No Domain model or user domain assignments | DOC-013 §5.1 (DOMAIN scope) | **HIGH** |
| G-005 | No VisibilityGrant table | DOC-013 §8 | **HIGH** |
| G-006 | No org_directory vs hr module separation | DOC-013 §6.2 | **HIGH** |
| G-007 | Agent MODULE_PERMISSIONS uses wrong roles | DOC-013 §9, DOC-014 §5 | **HIGH** |
| G-008 | API routes use hardcoded role arrays, not DB permissions | DOC-013 §3.3 (server-side authority) | **MEDIUM** |
| G-009 | No HR metadata vs sensitive field distinction | DOC-013 §6.3 | **HIGH** |
| G-010 | No Agent projections (DirectorySafeView, etc.) | DOC-013 §9.3 | **HIGH** |
| G-011 | knowledge_repository module not defined | DOC-013 §6.4 | **LOW** (placeholder OK) |
| G-012 | No automatic `all_employees` role assignment | DOC-013 §4.2 R-001 | **CRITICAL** |
| G-013 | No RBAC audit trail hooks for role/permission changes | DOC-013 §10.5 | **MEDIUM** |

---

## 2. Target Authorization Architecture (Derived from DOC-013/014)

### 2.1 Canonical Permission Evaluation Algorithm

```
FUNCTION evaluatePermission(user, module, operation, targetEntity):
    // Step 1: Default Deny
    IF user.roles IS EMPTY:
        RETURN DENIED

    // Step 2: Collect all permissions from all roles (union-of-allows)
    allPermissions = []
    FOR EACH role IN user.roles:
        FOR EACH permission IN role.permissions:
            IF permission.module == module AND permission.operation == operation:
                allPermissions.APPEND(permission)

    // Step 3: If no matching permission found, deny
    IF allPermissions IS EMPTY:
        RETURN DENIED

    // Step 4: Resolve effective scope (broadest wins)
    effectiveScope = resolveEffectiveScope(allPermissions, user, targetEntity)

    // Step 5: Check if target entity falls within effective scope
    IF entityWithinScope(targetEntity, effectiveScope, user):
        RETURN ALLOWED
    ELSE:
        RETURN DENIED
```

### 2.2 Scope Resolution

**Scope Precedence** (broadest to narrowest):
1. `ALL` - Unrestricted
2. `DOMAIN` - User's assigned domain(s)
3. `PROJECT` - Assigned projects + Visibility Grants
4. `OWN` - Entities created by or assigned to user
5. `SELF` - User's own record only

**Resolution Rules** (per DOC-013 §5.2):

```
FUNCTION resolveEffectiveScope(permissions, user, targetEntity):
    scopes = permissions.MAP(p => p.scope)

    // Return broadest applicable scope
    IF 'ALL' IN scopes:
        RETURN 'ALL'
    IF 'DOMAIN' IN scopes:
        RETURN 'DOMAIN'
    IF 'PROJECT' IN scopes:
        RETURN 'PROJECT'
    IF 'OWN' IN scopes:
        RETURN 'OWN'
    IF 'SELF' IN scopes:
        RETURN 'SELF'

    RETURN NULL  // No valid scope
```

**Entity Within Scope Check**:

```
FUNCTION entityWithinScope(entity, scope, user):
    SWITCH scope:
        CASE 'ALL':
            RETURN TRUE

        CASE 'DOMAIN':
            // Entity must be in user's assigned domain(s)
            RETURN entity.domainId IN user.assignedDomainIds

        CASE 'PROJECT':
            // Entity must be in user's assigned projects OR visibility grants
            projectId = getEntityProjectId(entity)
            RETURN projectId IN user.assignedProjectIds
                OR projectId IN user.visibilityGrantProjectIds

        CASE 'OWN':
            RETURN entity.createdById == user.id
                OR entity.assignedToId == user.id

        CASE 'SELF':
            // Only for user's own record (HR self-access)
            RETURN entity.id == user.employeeId
```

### 2.3 Project Assignment vs Visibility Grant Rules

**Per DOC-013 §5.2 S-005 and §8**:

| Access Type | Assignment | Visibility Grant |
|-------------|------------|------------------|
| READ | ✅ Yes | ✅ Yes |
| CREATE | ✅ Yes | ❌ No |
| UPDATE | ✅ Yes | ❌ No |
| DELETE | ✅ Yes | ❌ No |
| ADMIN | ✅ Yes | ❌ No |

**Visibility Grant Constraints** (DOC-013 §8.4):
- V-001: Knowledge access only, no authority
- V-002: No HR access to project personnel (only DirectorySafeView)
- V-003: Access mediated through ProjectKnowledgeView projection

**Implementation Rule**:
```
FUNCTION canWriteToProject(user, projectId):
    // Visibility grants NEVER enable writes
    RETURN projectId IN user.directlyAssignedProjectIds
    // NOT: projectId IN user.visibilityGrantProjectIds
```

### 2.4 HR Metadata Limitation Enforcement

**Per DOC-013 §6.3 (M-005, M-006, M-007)**:

| HR Scope | Fields Accessible |
|----------|-------------------|
| `ALL` | Full HR record (sensitive + metadata) |
| `DOMAIN` | **HR Metadata only** |
| `PROJECT` | **HR Metadata only** |
| `SELF` | User's own full HR record |

**HR Metadata Fields** (DOC-013 §2.1):
- Employee name (firstName, lastName)
- Job title / role
- Department / domain assignment
- Project assignments
- Employment status

**HR Sensitive Fields** (EXCLUDED from Metadata):
- `idNumber` (Government ID)
- `address` (Home address)
- `personalEmail`, `spousePhone`, `spouseEmail` (Personal contact)
- `grossSalary` (Compensation)
- `contractFileUrl` (Employment contracts)
- Performance evaluations (future)
- Banking details (future)

**API Boundary Enforcement**:

```typescript
interface HrMetadataProjection {
  id: string;
  firstName: string;
  lastName: string;
  role: string;           // Job title
  department: string;
  status: string;         // Employment status
  // NO: idNumber, address, grossSalary, etc.
}

interface HrFullProjection extends HrMetadataProjection {
  idNumber: string;
  address: string;
  grossSalary: number;
  // ... all sensitive fields
}

function getHrData(userId: string, targetEmployeeId: string, scope: Scope): HrMetadataProjection | HrFullProjection {
  if (scope === 'ALL') {
    return prisma.employee.findUnique({ ... }); // Full data
  }
  if (scope === 'SELF' && targetEmployeeId === getEmployeeIdForUser(userId)) {
    return prisma.employee.findUnique({ ... }); // Full own data
  }
  // DOMAIN or PROJECT scope = metadata only
  return prisma.employee.findUnique({
    select: {
      id: true, firstName: true, lastName: true,
      role: true, department: true, status: true
      // Explicitly exclude sensitive fields
    }
  });
}
```

### 2.5 Agent Projections Model

**Per DOC-013 §9.3**:

#### 2.5.1 DirectorySafeView

**Source**: `Employee` table (org_directory module context)
**Access**: All authenticated users
**Purpose**: Organization directory lookups

```typescript
interface DirectorySafeView {
  id: string;
  fullName: string;         // firstName + lastName
  jobTitle: string;         // role field
  department: string;
  workEmail: string;        // email (work)
  officeExtension: string;  // phone (work)
  photoUrl: string;
  birthday: { month: number; day: number }; // birthDate without year
  tenureYears: number;      // Computed from startDate
}

// EXCLUDED (MUST NOT APPEAR):
// - idNumber, address, personalEmail
// - grossSalary, contractFileUrl
// - spouseX fields, children
// - All HR-sensitive data
```

#### 2.5.2 ProjectKnowledgeView

**Source**: `Project`, `ProjectEvent`, `Vendor` (via project associations)
**Access**: Projects where user has assignment OR Visibility Grant
**Purpose**: Project operational queries and knowledge sharing

```typescript
interface ProjectKnowledgeView {
  id: string;
  projectNumber: string;
  name: string;
  status: string;           // state field
  domain: string;           // category or new domain field
  milestones: { date: Date; description: string }[];
  events: {
    eventType: string;
    eventDate: Date;
    description: string;
  }[];
  personnel: DirectorySafeView[];  // Names only via join
  vendors: {
    organizationName: string;
    contactName: string;
  }[];
}

// EXCLUDED (MUST NOT APPEAR):
// - estimatedCost, financial details
// - Internal assessment notes
// - Vendor contract terms
// - Personnel compensation
```

#### 2.5.3 MyProfileView

**Source**: `Employee` filtered to requesting user
**Access**: Own record only
**Purpose**: Self-service profile queries

```typescript
interface MyProfileView {
  // All DirectorySafeView fields
  ...DirectorySafeView;

  // Additional own-record fields
  employmentStartDate: Date;
  employmentEndDate: Date | null;
  roleAssignments: string[];
  projectAssignments: {
    projectId: string;
    projectName: string;
    role: string;
    current: boolean;
  }[];
  // Future: leaveBalances
}

// EXCLUDED (even for own record):
// - grossSalary
// - Performance evaluations
// - Disciplinary records
```

### 2.6 Knowledge Repository Placeholder

**Per DOC-013 §6.4 (M-008 through M-011)**:

The `knowledge_repository` module key MUST exist in the permission system as a canonical placeholder, even without full permission matrix coverage.

**Implementation**:
```typescript
const CANONICAL_MODULES = [
  'org_directory',
  'hr',
  'projects',
  'events',
  'vendors',
  'vehicles',
  'equipment',
  'documents',
  'admin',
  'agent',
  'knowledge_repository'  // Placeholder - permissions deferred
] as const;
```

No permissions are granted for `knowledge_repository` in v1. When the module is implemented, permissions will follow established RBAC patterns.

---

## 3. Data Model Alignment (Prisma + DB) — Plan Only

### 3.1 Required Tables/Relations

#### 3.1.1 Roles and Permissions

| Table | Status | Action Required |
|-------|--------|-----------------|
| `Role` | EXISTS | UPDATE content to match DOC-013 §4.1 role names |
| `Permission` | EXISTS | ADD `scope` field (enum: ALL/DOMAIN/PROJECT/OWN/SELF) |
| `RolePermission` | EXISTS | No structural change, but re-seed with canon permissions |

**Permission Table Change**:
```prisma
model Permission {
  id          String           @id @default(cuid())
  module      String           // e.g., 'projects', 'hr'
  action      String           // e.g., 'READ', 'CREATE', 'UPDATE', 'DELETE', 'ADMIN'
  scope       String           // NEW: 'ALL', 'DOMAIN', 'PROJECT', 'OWN', 'SELF'
  description String?
  roles       RolePermission[]
  createdAt   DateTime         @default(now())

  @@unique([module, action, scope])  // Updated unique constraint
}
```

#### 3.1.2 User-Role Assignment (Multi-Role)

| Table | Status | Action Required |
|-------|--------|-----------------|
| `UserRole` | MISSING | CREATE junction table for multi-role support |

**New Model**:
```prisma
model UserRole {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  role      Role     @relation(fields: [roleId], references: [id])
  roleId    String
  createdAt DateTime @default(now())
  createdBy String?  // Audit: who assigned this role

  @@unique([userId, roleId])
}
```

**User Model Change**:
```prisma
model User {
  // ... existing fields ...
  // REMOVE: roleId String
  // REMOVE: role Role @relation(...)
  roles     UserRole[]  // NEW: multi-role relation
  // ... rest of model ...
}
```

#### 3.1.3 Domain Assignments

| Table | Status | Action Required |
|-------|--------|-----------------|
| `Domain` | MISSING | CREATE domain definition table |
| `UserDomainAssignment` | MISSING | CREATE user-to-domain mapping |
| `ProjectDomainAssignment` | IMPLICIT | Projects have `category` field; formalize as domain |

**New Models**:
```prisma
model Domain {
  id          String   @id @default(cuid())
  name        String   @unique  // e.g., 'construction', 'infrastructure'
  displayName String             // Hebrew name
  description String?
  isActive    Boolean  @default(true)
  users       UserDomainAssignment[]
  projects    Project[]  // Projects in this domain
  createdAt   DateTime @default(now())
}

model UserDomainAssignment {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  domain    Domain   @relation(fields: [domainId], references: [id])
  domainId  String
  createdAt DateTime @default(now())
  createdBy String?  // Audit

  @@unique([userId, domainId])
}
```

**Project Model Change**:
```prisma
model Project {
  // ... existing fields ...
  domainId    String?
  domain      Domain?  @relation(fields: [domainId], references: [id])
  // category field can remain for backward compatibility
}
```

#### 3.1.4 Project Assignments

| Table | Status | Action Required |
|-------|--------|-----------------|
| `ProjectManager` | EXISTS | Keep, but ensure links to User |
| `ProjectCoordinator` | EXISTS | Keep, but ensure links to User |
| `ProjectAssignment` (unified) | OPTIONAL | Consider unifying for simpler scope checks |

**Current State**: Assignments go through `Employee` via `ProjectManager` and `ProjectCoordinator` junction tables.

**Recommended**: Keep existing structure but add helper query to unify:
```typescript
async function getUserAssignedProjectIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: {
          managedProjects: true,
          coordinatedProjects: true,
          ledProjects: true,
        }
      }
    }
  });

  if (!user?.employee) return [];

  return [
    ...user.employee.managedProjects.map(p => p.projectId),
    ...user.employee.coordinatedProjects.map(p => p.projectId),
    ...user.employee.ledProjects.map(p => p.id),
  ];
}
```

#### 3.1.5 Visibility Grants

| Table | Status | Action Required |
|-------|--------|-----------------|
| `VisibilityGrant` | MISSING | CREATE per DOC-013 §8 |

**New Model**:
```prisma
model VisibilityGrant {
  id          String    @id @default(cuid())
  grantee     User      @relation("VisibilityGrantee", fields: [granteeId], references: [id])
  granteeId   String
  project     Project   @relation(fields: [projectId], references: [id])
  projectId   String
  grantor     User      @relation("VisibilityGrantor", fields: [grantorId], references: [id])
  grantorId   String
  reason      String?   // Optional justification
  isActive    Boolean   @default(true)
  revokedAt   DateTime?
  revokedBy   String?
  createdAt   DateTime  @default(now())

  @@unique([granteeId, projectId])  // One grant per user per project
  @@index([granteeId, isActive])
  @@index([projectId])
}
```

#### 3.1.6 Audit Trail Hooks (DOC-008 Alignment)

The existing `ActivityLog` table supports audit requirements. Specific RBAC events to log:

| Event | Action Value | Required Details |
|-------|--------------|------------------|
| Role assignment | `ROLE_ASSIGNED` | userId, roleId, assignedBy |
| Role removal | `ROLE_REMOVED` | userId, roleId, removedBy |
| Permission change | `PERMISSION_CHANGED` | roleId, before, after |
| Visibility grant created | `VISIBILITY_GRANT_CREATED` | granteeId, projectId, grantorId |
| Visibility grant revoked | `VISIBILITY_GRANT_REVOKED` | grantId, revokedBy |
| Authorization failure | `AUTHORIZATION_DENIED` | userId, module, operation, scope |

### 3.2 What Already Exists vs What Must Be Added/Altered

| Component | Exists | Needs Change | Change Type |
|-----------|--------|--------------|-------------|
| `User` | ✅ | ✅ | Remove `roleId`, add `roles[]` relation |
| `Role` | ✅ | ✅ | Re-seed with canon role names |
| `Permission` | ✅ | ✅ | Add `scope` field, update unique constraint |
| `RolePermission` | ✅ | ⚠️ | Re-seed with canon permissions |
| `UserRole` | ❌ | ➕ | Create new junction table |
| `Domain` | ❌ | ➕ | Create new table |
| `UserDomainAssignment` | ❌ | ➕ | Create new table |
| `VisibilityGrant` | ❌ | ➕ | Create new table |
| `Project` | ✅ | ✅ | Add `domainId` relation |
| `ActivityLog` | ✅ | ⚠️ | Ensure RBAC events logged |

---

## 4. Enforcement Points (Where to Put the Guardrails)

### 4.1 API Routes: Guard Pattern

**Proposed Pattern**: Centralized authorization guard that checks `{module, operation, scope}`.

**Location**: Create `src/lib/authorization.ts`

```typescript
// Signature
interface AuthorizationCheck {
  module: string;
  operation: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'ADMIN';
  targetEntity?: { id: string; domainId?: string; projectId?: string; createdById?: string };
}

async function requireAuthorization(
  session: Session,
  check: AuthorizationCheck
): Promise<{ authorized: boolean; effectiveScope?: string; reason?: string }>;

// Usage in API route
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authResult = await requireAuthorization(session, {
    module: 'projects',
    operation: 'READ',
  });

  if (!authResult.authorized) {
    await logAuthorizationFailure(session, 'projects', 'READ', authResult.reason);
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  // Fetch data filtered by effectiveScope
  const projects = await getProjectsForScope(session.user.id, authResult.effectiveScope);
  return NextResponse.json(projects);
}
```

**Route Migration Strategy**:
1. Create authorization library
2. Add to ONE route (pilot)
3. Verify behavior matches existing
4. Roll out to remaining routes incrementally

### 4.2 Server Actions: Guard Strategy

Server actions follow the same pattern as API routes:

```typescript
'use server';

export async function createEvent(projectId: string, data: EventData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const authResult = await requireAuthorization(session, {
    module: 'events',
    operation: 'CREATE',
    targetEntity: { projectId },
  });

  if (!authResult.authorized) {
    await logAuthorizationFailure(...);
    throw new Error('אין הרשאה ליצור אירוע בפרויקט זה');
  }

  // Proceed with creation
}
```

### 4.3 UI Gating vs Server-Side Enforcement

**Per DOC-013 §3.3**: Server-side is the SOLE authority. UI checks are convenience only.

| Concern | UI Responsibility | Server Responsibility |
|---------|-------------------|----------------------|
| Hide menu items | ✅ Check session.permissions | N/A |
| Disable buttons | ✅ Check session.permissions | N/A |
| Reject requests | ❌ Never trust | ✅ ALWAYS enforce |
| Filter data | ⚠️ May pre-filter for UX | ✅ MUST filter by scope |

**UI Permission Helper** (read from session):
```typescript
// src/lib/client-permissions.ts
export function canUserAccess(
  session: Session | null,
  module: string,
  operation: string
): boolean {
  if (!session?.user?.permissions) return false;
  // UI check only - server MUST re-verify
  return session.user.permissions.includes(`${module}:${operation}`);
}
```

### 4.4 Admin RBAC Editor

**Location**: Should live under `/app/(dashboard)/admin/rbac/`

**Required Endpoints**:

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/admin/rbac/roles` | GET | List all roles with permissions | Owner, Trust Officer |
| `/api/admin/rbac/roles/[id]` | GET | Get role details | Owner, Trust Officer |
| `/api/admin/rbac/roles/[id]/permissions` | PUT | Update role permissions | Owner only (except own role) |
| `/api/admin/rbac/users/[id]/roles` | GET | Get user's roles | Owner, Trust Officer |
| `/api/admin/rbac/users/[id]/roles` | PUT | Assign roles to user | Owner, Trust Officer |
| `/api/admin/rbac/visibility-grants` | GET/POST | Manage visibility grants | Owner, Trust Officer, Domain Head |

**Governance Constraints** (DOC-013 §10.2):
- G-001: Trust Officer MUST NOT modify Owner permissions
- G-002: Trust Officer MUST NOT modify own permissions
- G-003: No other role may modify RBAC configuration

### 4.5 Agent Endpoints: Authorization Constraints

**Current Location**: `src/app/api/agent/route.ts`

**Required Changes**:

1. **Replace MODULE_PERMISSIONS** with database-driven permission check
2. **Implement projection-based queries** instead of raw table access
3. **Add HR absolute prohibition check**

```typescript
// In agent route
const AGENT_PROHIBITED_MODULES = ['hr'] as const;

// Before any function execution
if (AGENT_PROHIBITED_MODULES.includes(requiredModule)) {
  // Log security event
  await logActivity({
    action: 'AGENT_HR_ACCESS_BLOCKED',
    category: 'SECURITY',
    module: 'agent',
    ...
  });

  // Return neutral response (per DOC-013 §9.4 A-002)
  // "אין לי גישה למידע זה" - without explaining why
}

// Permission check uses user's actual DB permissions, not hardcoded matrix
const userPermissions = await getUserPermissions(userId);
const hasAccess = userPermissions.some(p =>
  p.module === requiredModule &&
  p.action === 'READ'
);
```

**Projection Enforcement**:
```typescript
// Agent queries MUST use projections
const agentQueryFunctions = {
  getEmployeeDirectory: () => getDirectorySafeView(),       // NOT raw Employee
  getProjectInfo: (id) => getProjectKnowledgeView(id),     // NOT raw Project
  getMyProfile: (userId) => getMyProfileView(userId),      // Filtered HR
};
```

---

## 5. Step-by-Step Execution Plan (Small, Safe Increments)

### 5.1 First Milestone: Read-Only Enforcement for One Module

**Recommended Module**: `projects` (most used, well-understood, non-sensitive)

**Steps**:

| Step | Description | Files | Risk |
|------|-------------|-------|------|
| 5.1.1 | Create `src/lib/authorization.ts` with core permission check | New file | Low |
| 5.1.2 | Add `requireAuthorization()` function with basic module:operation check | authorization.ts | Low |
| 5.1.3 | Update `projects` GET route to use new guard | `src/app/api/projects/route.ts` | Medium |
| 5.1.4 | Verify existing behavior unchanged for current users | Manual test | Low |
| 5.1.5 | Add scope filtering to projects query (using current user's assigned projects) | authorization.ts, projects/route.ts | Medium |

**Acceptance Criteria**:
- [ ] Projects GET returns only projects user is authorized to see
- [ ] Unauthorized requests return 403 with Hebrew message
- [ ] Authorization failures logged to ActivityLog
- [ ] Existing founder/admin users see all projects (ALL scope)

**Rollback Strategy**: Revert authorization.ts import and restore original route handler.

### 5.2 Second Milestone: Project Assignment + PROJECT Scope

**Steps**:

| Step | Description | Files | Risk |
|------|-------------|-------|------|
| 5.2.1 | Add `scope` field to Permission model | schema.prisma | Medium (migration) |
| 5.2.2 | Create migration, run on dev | prisma/migrations/ | Low |
| 5.2.3 | Update seed to include scope in permissions | prisma/seed.ts | Low |
| 5.2.4 | Create `getUserAssignedProjectIds()` helper | authorization.ts | Low |
| 5.2.5 | Implement PROJECT scope filter in projects route | projects/route.ts | Medium |
| 5.2.6 | Add PROJECT scope enforcement to events route | events/route.ts | Medium |
| 5.2.7 | Test with non-admin users | Manual test | Low |

**Acceptance Criteria**:
- [ ] Users with PROJECT scope see only their assigned projects
- [ ] Users with ALL scope see all projects
- [ ] Events filtered by project scope
- [ ] Scope correctly logged in audit trail

**Rollback Strategy**: Migration includes down migration; revert code changes.

### 5.3 Third Milestone: Visibility Grants

**Steps**:

| Step | Description | Files | Risk |
|------|-------------|-------|------|
| 5.3.1 | Create VisibilityGrant model | schema.prisma | Low |
| 5.3.2 | Create migration | prisma/migrations/ | Low |
| 5.3.3 | Add visibility grant endpoints | `src/app/api/admin/visibility-grants/route.ts` | Medium |
| 5.3.4 | Update PROJECT scope resolution to include visibility grants | authorization.ts | Medium |
| 5.3.5 | Enforce READ-ONLY for visibility grants (block writes) | authorization.ts | Medium |
| 5.3.6 | Add audit logging for grant lifecycle | activity.ts | Low |

**Acceptance Criteria**:
- [ ] Visibility grants can be created by authorized grantors
- [ ] Grantees can READ project data but NOT write
- [ ] Grants appear in user's PROJECT scope
- [ ] All grant operations audited

**Rollback Strategy**: Remove visibility grant model and revert authorization changes.

### 5.4 Fourth Milestone: HR Metadata vs Sensitive + Agent Prohibition

**Steps**:

| Step | Description | Files | Risk |
|------|-------------|-------|------|
| 5.4.1 | Define HR_METADATA_FIELDS and HR_SENSITIVE_FIELDS constants | authorization.ts | Low |
| 5.4.2 | Create HrMetadataProjection type | types/hr.ts | Low |
| 5.4.3 | Update HR GET route to project fields based on scope | `src/app/api/hr/route.ts` | High |
| 5.4.4 | Add agent HR prohibition check | `src/app/api/agent/route.ts` | Medium |
| 5.4.5 | Implement DirectorySafeView projection | `src/lib/projections.ts` | Medium |
| 5.4.6 | Replace agent HR functions with DirectorySafeView | agent-queries.ts | High |
| 5.4.7 | Test Domain Head HR access (metadata only) | Manual test | Medium |

**Acceptance Criteria**:
- [ ] Domain Head sees HR metadata only for domain employees
- [ ] Senior PM sees HR metadata only for project employees
- [ ] Agent NEVER receives HR data (returns "אין לי גישה למידע זה")
- [ ] DirectorySafeView excludes all sensitive fields
- [ ] Salary data NEVER exposed except to ALL scope holders

**Rollback Strategy**: Restore original HR route; remove agent prohibition (DANGEROUS - milestone is critical).

### 5.5 Fifth Milestone: Multi-Role Support + Canon Role Names

**Steps**:

| Step | Description | Files | Risk |
|------|-------------|-------|------|
| 5.5.1 | Create UserRole junction table | schema.prisma | Medium |
| 5.5.2 | Migrate existing User.roleId to UserRole entries | migration script | High |
| 5.5.3 | Update Role seed with canon names | seed.ts | Medium |
| 5.5.4 | Update auth session to load multiple roles | auth.ts | High |
| 5.5.5 | Update permission evaluation for union-of-allows | authorization.ts | Medium |
| 5.5.6 | Implement automatic all_employees assignment | auth.ts signIn callback | Medium |
| 5.5.7 | Full regression test all routes | Automated + manual | High |

**Acceptance Criteria**:
- [ ] Users can have multiple roles
- [ ] Permission evaluation uses union-of-allows
- [ ] All users automatically get all_employees role
- [ ] Session reflects all assigned roles
- [ ] UI displays primary role + additional roles

**Rollback Strategy**: Data migration must be reversible; keep User.roleId until verified.

---

## 6. Verification Checklist

### 6.1 Minimal Automated Tests

Create `src/__tests__/authorization.test.ts`:

```typescript
describe('Authorization: Default Deny', () => {
  it('denies access when user has no roles', async () => {
    const result = await evaluatePermission(userWithNoRoles, 'projects', 'READ', {});
    expect(result.authorized).toBe(false);
  });

  it('denies access when role lacks permission', async () => {
    const result = await evaluatePermission(operationsStaffUser, 'admin', 'UPDATE', {});
    expect(result.authorized).toBe(false);
  });
});

describe('Authorization: Union-of-Allows', () => {
  it('grants access if ANY role has permission', async () => {
    // User has both operations_staff and senior_pm roles
    const result = await evaluatePermission(multiRoleUser, 'events', 'DELETE', { projectId: 'assigned' });
    // senior_pm has events:DELETE:PROJECT, operations_staff doesn't
    expect(result.authorized).toBe(true);
  });

  it('uses broadest scope from all roles', async () => {
    // User has domain_head (DOMAIN) and all_employees (PROJECT)
    const result = await evaluatePermission(domainHeadUser, 'projects', 'READ', {});
    expect(result.effectiveScope).toBe('DOMAIN'); // Broader wins
  });
});

describe('Authorization: Scope Resolution', () => {
  it('PROJECT scope includes assigned projects', async () => {
    const result = await evaluatePermission(projectCoordinator, 'projects', 'READ', { id: 'assigned-project' });
    expect(result.authorized).toBe(true);
  });

  it('PROJECT scope includes visibility grants for READ', async () => {
    const result = await evaluatePermission(seniorPmWithGrant, 'projects', 'READ', { id: 'granted-project' });
    expect(result.authorized).toBe(true);
  });

  it('PROJECT scope excludes visibility grants for WRITE', async () => {
    const result = await evaluatePermission(seniorPmWithGrant, 'projects', 'UPDATE', { id: 'granted-project' });
    expect(result.authorized).toBe(false); // Grant is read-only
  });
});

describe('Authorization: Visibility Grant Constraints', () => {
  it('visibility grant enables READ only', async () => {
    const readResult = await evaluatePermission(userWithGrant, 'projects', 'READ', { id: 'granted-project' });
    const createResult = await evaluatePermission(userWithGrant, 'events', 'CREATE', { projectId: 'granted-project' });

    expect(readResult.authorized).toBe(true);
    expect(createResult.authorized).toBe(false);
  });
});

describe('Authorization: HR Sensitive Inaccessible to Agent', () => {
  it('agent cannot access HR module', async () => {
    const agentCheck = checkAgentModuleAccess('hr');
    expect(agentCheck.allowed).toBe(false);
    expect(agentCheck.reason).toBe('ABSOLUTE_PROHIBITION');
  });

  it('agent receives neutral response for HR queries', async () => {
    const response = await simulateAgentQuery(testUser, 'מה השכר של דני?');
    expect(response.meta.state).not.toBe('ANSWER_WITH_DATA');
    expect(response.response).toBe('אין לי גישה למידע זה.');
    // Must NOT reveal that salary data exists
  });
});

describe('Authorization: HR Metadata vs Sensitive', () => {
  it('DOMAIN scope returns metadata only', async () => {
    const hrData = await getHrDataWithScope(domainHeadUser, targetEmployeeInDomain, 'DOMAIN');

    expect(hrData.firstName).toBeDefined();
    expect(hrData.lastName).toBeDefined();
    expect(hrData.role).toBeDefined();
    expect(hrData.grossSalary).toBeUndefined();
    expect(hrData.idNumber).toBeUndefined();
    expect(hrData.address).toBeUndefined();
  });

  it('ALL scope returns full data', async () => {
    const hrData = await getHrDataWithScope(trustOfficerUser, targetEmployee, 'ALL');

    expect(hrData.grossSalary).toBeDefined();
    expect(hrData.idNumber).toBeDefined();
  });
});
```

### 6.2 Manual QA Scripts (curl-level)

#### Test 1: Default Deny - Unauthenticated

```bash
# Should return 401
curl -X GET http://localhost:3000/api/projects \
  -H "Content-Type: application/json"

# Expected: {"error":"Unauthorized"}, status 401
```

#### Test 2: Default Deny - No Permissions

```bash
# Create test user with no roles (requires DB setup)
# Then authenticate and try to access

curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: next-auth.session-token=<operations_staff_token>"

# Expected: {"error":"אין הרשאה"}, status 403
```

#### Test 3: PROJECT Scope - Assigned Only

```bash
# As project_coordinator assigned to project-123 only
curl -X GET http://localhost:3000/api/projects \
  -H "Cookie: next-auth.session-token=<coordinator_token>"

# Expected: Only project-123 in response, not all projects
```

#### Test 4: Visibility Grant - Read Only

```bash
# As senior_pm with visibility grant to project-456
# READ should work
curl -X GET http://localhost:3000/api/projects/project-456 \
  -H "Cookie: next-auth.session-token=<senior_pm_token>"

# Expected: 200 with project data

# CREATE event should fail
curl -X POST http://localhost:3000/api/projects/project-456/events \
  -H "Cookie: next-auth.session-token=<senior_pm_token>" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"meeting","description":"test"}'

# Expected: 403 - visibility grant doesn't allow writes
```

#### Test 5: Agent HR Prohibition

```bash
# As any authenticated user via agent
curl -X POST http://localhost:3000/api/agent \
  -H "Cookie: next-auth.session-token=<any_user_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"מה השכר הממוצע בחברה?"}'

# Expected: Response with "אין לי גישה למידע זה."
# NOT an error, NOT revealing that salary data exists
```

#### Test 6: HR Metadata Boundary

```bash
# As domain_head
curl -X GET "http://localhost:3000/api/hr?domain=construction" \
  -H "Cookie: next-auth.session-token=<domain_head_token>"

# Expected: Employees in domain with metadata fields only
# Response should NOT contain: grossSalary, idNumber, address, contractFileUrl
```

---

## 7. Summary of Changes by File

| File | Change Type | Priority |
|------|-------------|----------|
| `prisma/schema.prisma` | Modify + Add models | P0 |
| `prisma/seed.ts` | Rewrite with canon data | P0 |
| `src/lib/authorization.ts` | New file | P0 |
| `src/lib/auth.ts` | Update session loading | P1 |
| `src/lib/agent-response.ts` | Replace MODULE_PERMISSIONS | P1 |
| `src/lib/projections.ts` | New file for views | P1 |
| `src/app/api/projects/route.ts` | Add authorization guard | P1 |
| `src/app/api/hr/route.ts` | Add metadata projection | P1 |
| `src/app/api/agent/route.ts` | HR prohibition + DB permissions | P1 |
| All other API routes | Add authorization guard | P2 |
| `src/app/(dashboard)/admin/rbac/` | New UI pages | P3 |

---

## 8. Canon Compliance Verification

After implementation, verify against DOC-013 §14 Compliance Checklist:

- [ ] C-001: Default authorization state is deny
- [ ] C-002: All authenticated users hold `all_employees` role
- [ ] C-003: Permission evaluation uses union-of-allows semantics
- [ ] C-004: All authorization decisions are server-side
- [ ] C-005: Authorization enforced identically across all access paths
- [ ] C-006: Only the nine official roles exist in the system
- [ ] C-007: Only the five official scopes exist in the system
- [ ] C-008: Role-permission mappings match §7.3 specifications
- [ ] C-014: Agent CANNOT access HR module
- [ ] C-015: HR READ with DOMAIN/PROJECT scope returns HR Metadata only
- [ ] C-016: Visibility Grants are explicit, not automatic
- [ ] C-017: Visibility Grants enable read-only access only
- [ ] C-020: Agent accesses data only through official Projections
- [ ] C-021: Agent is read-only

---

**End of Implementation Plan**
