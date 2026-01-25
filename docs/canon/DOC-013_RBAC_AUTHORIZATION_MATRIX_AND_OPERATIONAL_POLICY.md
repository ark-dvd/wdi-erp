---
Canonical Document ID: DOC-013
Document Title: RBAC Authorization Matrix & Operational Policy
Document Type: Canonical
Status: Pre-Canonical
Baseline Reference: Extends Canonical Baseline v1.2
Foundation Document: DOC-006 (Authorization Model & RBAC Specification)
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Signatory: Chief Technology Officer (CTO)
Timezone: America/Chicago (CST)
Created At: 2026-01-25 11:32:01 CST
Last Updated: 2026-01-25 11:37:13 CST
Current Version: v1.1
---

# DOC-013 — RBAC Authorization Matrix & Operational Policy

---

## 1. Purpose

### 1.1 Document Intent

This document defines the **operational authorization matrix** for the WDI ERP system. It specifies the concrete roles, scopes, modules, permissions, and governance rules that implement the RBAC framework established in DOC-006.

Where DOC-006 defines *how* authorization works, this document defines *what* the authorization configuration is.

### 1.2 Authority Relationship

This document extends DOC-006 (Authorization Model & RBAC Specification). It operates within the constraints established by that document and does not override, weaken, or contradict any principle therein.

If any provision of this document appears to conflict with DOC-006, DOC-006 prevails unconditionally.

### 1.3 Binding Force

This document is binding on:
- All authorization configuration within the WDI ERP system
- All role assignment decisions
- All permission grant operations
- All Agent data access patterns
- All administrative UI for RBAC management

Non-compliance with this document constitutes a governance defect.

---

## 2. Definitions

### 2.1 Core Terminology

| Term | Definition |
|------|------------|
| **Role** | A named collection of permissions representing a job function or access profile. Users are assigned roles; roles carry permissions. |
| **Scope** | A boundary that limits the extent of a permission grant. Scopes define *what data* a permission applies to. |
| **Module** | A functional area of the system with its own data entities and access patterns. |
| **Permission** | An explicit grant allowing a specific operation on data within a defined scope. |
| **Projection** | A curated, security-filtered view of data designed for specific access patterns. |
| **Visibility Grant** | An explicit, revocable authorization enabling read-only knowledge access to data outside a user's default scope. |
| **HR Metadata** | Non-sensitive personnel information limited to: employee name, job title, department/domain assignment, project assignments, and employment status. HR Metadata explicitly excludes all sensitive HR data (see §6.2). |

### 2.2 Normative Language

This document uses RFC 2119 terminology:
- **MUST** / **MUST NOT**: Absolute requirement or prohibition.
- **SHOULD** / **SHOULD NOT**: Strong recommendation; deviation requires documented justification.
- **MAY**: Optional provision.

---

## 3. Non-Negotiable Principles

### 3.1 Default Deny

The default authorization state is **no access**.

A user without role assignment has no permissions. A permission not explicitly granted does not exist. Absence of denial is not presence of grant.

### 3.2 Union-of-Allows Evaluation

Users may hold multiple roles. Permission evaluation follows **union semantics**:
- Collect all permissions from all assigned roles
- If any permission grants the requested operation within scope, access is allowed
- If no permission grants the requested operation, access is denied

There is no "deny" permission. Permissions are purely additive.

### 3.3 Server-Side Authority

All authorization decisions are made server-side. Client-side permission checks are UX conveniences with no security value. The server is the sole authority.

### 3.4 Uniform Enforcement

Authorization is enforced identically across all access paths: UI, API, background jobs, Agent queries, internal service calls. No path receives implicit trust or relaxed enforcement.

### 3.5 Audit Trail Requirement

All permission changes, role assignments, and authorization failures MUST be logged per DOC-008. Audit trails are immutable and cannot be bypassed.

---

## 4. Official Roles (v1)

### 4.1 Role Enumeration

The system defines exactly nine (9) official roles as of v1:

| Role ID | Role Name (EN) | Role Name (HE) | Description |
|---------|----------------|----------------|-------------|
| `owner` | Owner | בעלים | Organization owner with unrestricted system access. Ultimate authority. |
| `executive` | Executive (CEO) | מנכ"ל | Executive leadership with full operational visibility and control. |
| `trust_officer` | Trust Officer | מנהל משרד | Office Manager / HR-Ops coordinator. Administrative and personnel authority. |
| `finance_officer` | Finance Officer | מנהל כספים | Financial operations oversight (non-accounting scope per P001 §2.2). |
| `domain_head` | Domain Head | ראש תחום | Head of a functional domain (e.g., Construction, Infrastructure). |
| `senior_pm` | Senior PM | מנהל פרויקט בכיר | Senior project management with cross-project responsibilities. |
| `project_coordinator` | Project Coordinator | רכז פרויקט | Project-level coordination and operational tasks. |
| `operations_staff` | Operations Staff | צוות תפעול | Operational employees with task-focused access. |
| `all_employees` | All Employees | כל העובדים | Baseline role assigned to every authenticated user. |

### 4.2 Role Assignment Rules

**R-001**: Every authenticated user MUST hold the `all_employees` role. This is automatic and cannot be removed.

**R-002**: Users MAY hold one or more additional roles beyond `all_employees`.

**R-003**: Role assignment MUST be performed by an authorized administrator (Owner or Trust Officer) and MUST be logged.

**R-004**: Role assignment takes effect immediately upon commitment to the database. There is no propagation delay.

**R-005**: Role changes MUST generate audit records capturing: actor, target user, previous roles, new roles, timestamp, and reason (if provided).

### 4.3 Role Hierarchy

Roles do not form a strict hierarchy. However, the following precedence applies for conflict resolution and administrative scope:

```
Owner
  ↓
Executive (CEO)
  ↓
Trust Officer / Finance Officer / Domain Head (peer level)
  ↓
Senior PM
  ↓
Project Coordinator
  ↓
Operations Staff
  ↓
All Employees (baseline)
```

Higher roles do not inherit lower role permissions automatically. Permissions are explicitly assigned per role. The hierarchy affects administrative scope only.

---

## 5. Official Scopes (v1)

### 5.1 Scope Enumeration

The system defines exactly five (5) official scopes:

| Scope ID | Scope Name | Definition |
|----------|------------|------------|
| `ALL` | All | Unrestricted access to all instances of the entity type within the organization. |
| `DOMAIN` | Domain | Access limited to entities within the user's assigned functional domain(s). |
| `PROJECT` | Project | Access limited to entities associated with projects where the user is assigned or has explicit visibility. |
| `OWN` | Own | Access limited to entities created by or explicitly assigned to the user. |
| `SELF` | Self | Access limited to the user's own personal record (employee profile, HR record). |

### 5.2 Scope Semantics

**S-001**: Scopes are mutually exclusive within a single permission grant. A permission specifies exactly one scope.

**S-002**: Multiple permissions on the same operation with different scopes result in the **broadest applicable scope** (union semantics).

**S-003**: Scope evaluation occurs at query time. Scope membership is not cached beyond request scope.

**S-004**: `SELF` scope applies exclusively to the user's own records. It MUST NOT be interpreted as "created by self" (that is `OWN`).

**S-005**: `PROJECT` scope includes both directly assigned projects AND projects with explicit Visibility Grants (see §8).

### 5.3 Scope Resolution Examples

| User Role | Permission | Scope | Effective Access |
|-----------|------------|-------|------------------|
| Domain Head | Projects:READ | DOMAIN | All projects within user's domain(s) |
| Project Coordinator | Events:CREATE | PROJECT | Events on assigned projects only |
| Operations Staff | Vehicles:READ | ALL | All vehicles (fleet-wide visibility) |
| All Employees | HR:READ | SELF | User's own HR record only |

---

## 6. System Modules

### 6.1 Module Enumeration

The system is organized into the following modules:

| Module ID | Module Name | Module Name (HE) | Description | Data Classification | Status |
|-----------|-------------|------------------|-------------|---------------------|--------|
| `org_directory` | Org Directory | ספר הארגון | Organization directory with directory-safe employee information. | Internal | Active |
| `hr` | HR | משאבי אנוש | Sensitive personnel data: contracts, salary, employment documents. | Confidential / Restricted | Active |
| `projects` | Projects | פרויקטים | Project hierarchy, status, timeline, assignments. | Internal | Active |
| `events` | Events | אירועים | Operational event log (journal). | Internal | Active |
| `vendors` | Vendors | ספקים | Vendor organizations, contacts, ratings, relationships. | Internal | Active |
| `vehicles` | Vehicles | רכבים | Fleet management: vehicles, assignments, status, maintenance. | Internal | Active |
| `equipment` | Equipment | ציוד | Asset management: equipment items, assignments, locations. | Internal | Active |
| `documents` | Documents | מסמכים | Document storage metadata (attached to other entities). | Varies by attachment context | Active |
| `admin` | Administration | ניהול מערכת | System configuration, user management, RBAC administration. | Confidential | Active |
| `agent` | WDI Agent | סוכן WDI | AI-powered query interface. | Per user authorization context | Active |
| `knowledge_repository` | Knowledge Repository | מאגר המידע | Organization-wide institutional knowledge repository. | Internal | Canonical Placeholder |

### 6.2 Org Directory vs HR Separation (Critical)

**M-001**: Org Directory and HR are **distinct modules** with different sensitivity levels and access patterns.

**Org Directory** contains **directory-safe** information intended for general organizational visibility:
- Full name
- Job title / role
- Department / domain
- Work contact information (email, extension)
- Profile photo
- Birthday (date and month only; Hebrew cultural norm: birthdays are not considered sensitive)
- Employment start date (tenure)

**HR** contains **sensitive** personnel information restricted to authorized personnel:
- Government ID numbers
- Home address
- Personal contact information
- Salary and compensation
- Employment contracts
- Performance evaluations
- Disciplinary records
- Medical accommodations
- Banking details

**M-002**: The Org Directory module MUST NOT contain any HR-sensitive fields.

**M-003**: The HR module MUST NOT be accessible to the Agent under any circumstances. This is an absolute prohibition.

**M-004**: Birthday visibility in Org Directory is intentional and reflects Israeli workplace culture. This is not a defect.

### 6.3 HR Metadata Scope Limitation (Critical)

**M-005**: When HR READ permission is granted with DOMAIN or PROJECT scope (as opposed to ALL or SELF), access is LIMITED to **HR Metadata only** (see §2.1 definition).

**M-006**: HR READ with DOMAIN or PROJECT scope MUST NOT grant access to:
- Salary and compensation data
- Employment contracts
- Performance evaluations
- Disciplinary records
- Banking details
- Government ID numbers
- Home address
- Personal contact information
- Medical accommodations

**M-007**: Only HR READ with ALL scope (granted to Owner, Executive, Trust Officer, and Finance Officer for compensation subset) provides access to sensitive HR fields, subject to role-specific field restrictions.

### 6.4 Knowledge Repository Module (Canonical Placeholder)

**M-008**: The Knowledge Repository module (`knowledge_repository` / מאגר המידע) is a **canonical placeholder** for organization-wide institutional knowledge.

**Conceptual Content** (non-exhaustive):
- Tenders the organization participated in
- Tenders the organization did not participate in (with rationale)
- Standards and specifications
- General specifications (non-project-specific)
- Internal knowledge assets and lessons learned (non-project-bound)

**M-009**: The Knowledge Repository is a single unified module. It MUST NOT be split into sub-modules.

**M-010**: Full permission matrix coverage for Knowledge Repository is deferred until module implementation. When implemented, permissions MUST follow the same RBAC patterns established in this document.

**M-011**: The Agent MAY consume Knowledge Repository data in the future, strictly via curated projections and within RBAC boundaries. This does not grant automatic Agent access; it establishes canonical eligibility.

---

## 7. Permission Matrix

### 7.1 Permission Structure

Each permission is defined as: `{Module}:{Operation}:{Scope}`

Standard operations per module:
- `READ` — View records
- `CREATE` — Create new records
- `UPDATE` — Modify existing records
- `DELETE` — Soft-delete records (or archive)
- `ADMIN` — Administrative operations (configuration, bulk actions)

### 7.2 Baseline Role: All Employees

Every user automatically receives `all_employees`. This role provides the **minimum baseline access** for any authenticated employee.

| Module | Operation | Scope | Notes |
|--------|-----------|-------|-------|
| `org_directory` | READ | ALL | Full directory visibility (directory-safe fields only) |
| `hr` | READ | SELF | Own HR record only |
| `projects` | READ | PROJECT | Projects where user is assigned |
| `events` | READ | PROJECT | Events on assigned projects |
| `events` | CREATE | PROJECT | Log events on assigned projects (see justification below) |
| `vendors` | READ | ALL | Vendor contact lookup |
| `vehicles` | READ | ALL | Fleet visibility |
| `equipment` | READ | ALL | Equipment visibility |
| `documents` | READ | PROJECT | Documents attached to assigned project entities |
| `agent` | QUERY | — | Access to WDI Agent (read-only queries within authorization scope) |

**All other permissions are DENIED by default for All Employees.**

**Justification for `events:CREATE:PROJECT` in baseline**: This permission is intentional and serves critical operational requirements. Field-level operational logging enables real-time documentation of site activities, safety incidents, material deliveries, and work progress. Granting event creation to all employees on their assigned projects ensures traceability, accountability, and institutional memory capture at the point of occurrence. Restricting this permission would undermine the operational journal's completeness and shift documentation burden inappropriately.

### 7.3 Role-Based Permission Grants

#### 7.3.1 Owner

| Module | Permissions | Scope |
|--------|-------------|-------|
| All modules | ALL operations | ALL |

The Owner role has unrestricted access. This is the only role with implicit full access.

#### 7.3.2 Executive (CEO)

| Module | Permissions | Scope |
|--------|-------------|-------|
| `org_directory` | READ | ALL |
| `hr` | READ | ALL |
| `projects` | READ, UPDATE | ALL |
| `events` | READ, CREATE, UPDATE | ALL |
| `vendors` | READ, UPDATE | ALL |
| `vehicles` | READ | ALL |
| `equipment` | READ | ALL |
| `documents` | READ | ALL |
| `admin` | READ | — |
| `agent` | QUERY | — |

The Executive sees all operational data but does not have DELETE or ADMIN permissions by default (prevents accidental destruction).

#### 7.3.3 Trust Officer

| Module | Permissions | Scope |
|--------|-------------|-------|
| `org_directory` | READ, UPDATE | ALL |
| `hr` | READ, CREATE, UPDATE, DELETE | ALL |
| `projects` | READ | ALL |
| `events` | READ, CREATE | ALL |
| `vendors` | READ, CREATE, UPDATE | ALL |
| `vehicles` | READ, CREATE, UPDATE, DELETE | ALL |
| `equipment` | READ, CREATE, UPDATE, DELETE | ALL |
| `documents` | READ, CREATE, UPDATE, DELETE | ALL |
| `admin` | READ, UPDATE | — |
| `agent` | QUERY | — |

The Trust Officer is the primary administrative authority for personnel, vendors, and assets.

#### 7.3.4 Finance Officer

| Module | Permissions | Scope |
|--------|-------------|-------|
| `org_directory` | READ | ALL |
| `hr` | READ | ALL (compensation fields only) |
| `projects` | READ | ALL |
| `events` | READ | ALL |
| `vendors` | READ, UPDATE | ALL |
| `vehicles` | READ | ALL |
| `equipment` | READ | ALL |
| `documents` | READ | ALL (financial documents) |
| `agent` | QUERY | — |

The Finance Officer has read-heavy access for financial oversight. Note: Actual accounting/invoicing is out of scope per P001 §2.2.

#### 7.3.5 Domain Head

| Module | Permissions | Scope | Scope Clarification |
|--------|-------------|-------|---------------------|
| `org_directory` | READ | ALL | — |
| `hr` | READ | DOMAIN | **HR Metadata only** per §6.3 (personnel in their domain) |
| `projects` | READ, UPDATE, CREATE | DOMAIN | — |
| `events` | READ, CREATE, UPDATE | DOMAIN | — |
| `vendors` | READ | ALL | — |
| `vehicles` | READ, UPDATE | DOMAIN | Assigned to domain |
| `equipment` | READ, UPDATE | DOMAIN | — |
| `documents` | READ, CREATE, UPDATE | DOMAIN | — |
| `agent` | QUERY | — | — |

The Domain Head manages their functional area with full operational authority within that boundary. HR access is limited to metadata for coordination purposes.

#### 7.3.6 Senior PM

| Module | Permissions | Scope | Scope Clarification |
|--------|-------------|-------|---------------------|
| `org_directory` | READ | ALL | — |
| `hr` | READ | PROJECT | **HR Metadata only** per §6.3 (personnel assigned to their projects) |
| `projects` | READ, UPDATE | PROJECT + Visibility Grants | — |
| `events` | READ, CREATE, UPDATE, DELETE | PROJECT | — |
| `vendors` | READ | ALL | — |
| `vehicles` | READ | ALL | — |
| `equipment` | READ | ALL | — |
| `documents` | READ, CREATE, UPDATE | PROJECT | — |
| `agent` | QUERY | — | — |

Senior PMs have cross-project coordination capability through Visibility Grants. HR access is limited to metadata for team coordination purposes.

#### 7.3.7 Project Coordinator

| Module | Permissions | Scope |
|--------|-------------|-------|
| `org_directory` | READ | ALL |
| `hr` | READ | SELF |
| `projects` | READ, UPDATE | PROJECT (assigned only) |
| `events` | READ, CREATE, UPDATE | PROJECT |
| `vendors` | READ | ALL |
| `vehicles` | READ | ALL |
| `equipment` | READ | ALL |
| `documents` | READ, CREATE | PROJECT |
| `agent` | QUERY | — |

Project Coordinators focus on their assigned projects with limited administrative capability.

#### 7.3.8 Operations Staff

| Module | Permissions | Scope |
|--------|-------------|-------|
| `org_directory` | READ | ALL |
| `hr` | READ | SELF |
| `projects` | READ | PROJECT (assigned only) |
| `events` | READ, CREATE | PROJECT |
| `vendors` | READ | ALL |
| `vehicles` | READ | ALL |
| `equipment` | READ | ALL |
| `documents` | READ | PROJECT |
| `agent` | QUERY | — |

Operations Staff have task-focused access: primarily event logging and lookups.

---

## 8. Project Visibility Grants

### 8.1 Purpose

The organization requires **non-automatic knowledge sharing** across projects for learning, coordination, and institutional knowledge. However, this sharing must be:
- Explicit (not automatic)
- Revocable
- Auditable
- Read-only

**Visibility Grants** solve this requirement.

### 8.2 Definition

A **Project Visibility Grant** is an explicit authorization that enables a user to view data associated with a specific project, even when that project is outside their normal assignment scope.

### 8.3 Visibility Grant Properties

| Property | Specification |
|----------|---------------|
| Grantor | Owner, Trust Officer, or Domain Head of the target project's domain |
| Grantee | Any authenticated user |
| Target | Specific project (by project ID) |
| Access Level | READ-ONLY (no writes, no approvals) |
| Duration | Until explicitly revoked OR user offboarding |
| Auditability | Grant creation, grant revocation, and all access via grant MUST be logged |

### 8.4 Visibility vs Authority

**V-001**: A Visibility Grant enables **knowledge access** only. It MUST NOT enable:
- Creating or modifying project data
- Approving or rejecting workflows
- Assigning resources to the project
- Administrative operations on the project

**V-002**: Visibility Grants do not grant HR access to project personnel. Only directory-safe information (via Org Directory) is accessible.

**V-003**: Visibility Grant access is mediated through the **Knowledge-Safe Projection** (see §9.3).

### 8.5 Grant Lifecycle

1. **Request** (optional): User requests visibility to a project.
2. **Authorization**: Authorized administrator (Owner, Trust Officer, or relevant Domain Head) approves.
3. **Activation**: Grant is recorded and takes effect immediately.
4. **Usage**: Grantee accesses project data through Knowledge-Safe Projection.
5. **Revocation**: Administrator revokes grant, OR user is offboarded. Grant becomes inactive.

All lifecycle events are audited.

---

## 9. Agent Access Model

### 9.1 Agent Authorization Principle

Per DOC-006 §5.3 and P006, the WDI Agent:
- Operates within the requesting user's authorization context
- Is permanently read-only
- MUST NOT access raw database tables

### 9.2 Projection-Based Access

The Agent MUST access data exclusively through **curated Projections**. Projections are:
- Pre-defined views with security filtering applied
- Designed to prevent inference leakage
- Auditable and cacheable

### 9.3 Official Projections

The Agent has access to three (3) official projections, with a fourth reserved for future implementation:

#### 9.3.1 DirectorySafeView

**Purpose**: Provide directory information for organizational lookups.

**Source Module**: Org Directory

**Included Fields**:
- Employee UUID
- Full name
- Job title
- Department / Domain
- Work email
- Office extension
- Profile photo URL
- Birthday (date and month only)
- Tenure (years since start date)

**Excluded Fields** (MUST NOT appear):
- Government ID
- Home address
- Personal contact
- Salary / compensation
- Any HR-sensitive data

**Access Rule**: Available to all authenticated users via Agent.

#### 9.3.2 ProjectKnowledgeView

**Purpose**: Provide project information for operational queries and knowledge sharing.

**Source Module**: Projects, Events, Vendors (project associations)

**Included Fields**:
- Project UUID and name
- Project status (active, completed, on-hold)
- Project domain
- Key milestones (dates only)
- Event summaries (event type, date, description)
- Assigned personnel (names only, via DirectorySafeView join)
- Associated vendors (organization names and contact names)

**Excluded Fields** (MUST NOT appear):
- Financial details (budget, costs, margins)
- Internal assessment notes
- Vendor contract terms
- Personnel compensation

**Access Rule**: Available for projects where user has direct assignment OR Visibility Grant.

#### 9.3.3 MyProfileView

**Purpose**: Allow users to query their own complete profile.

**Source Module**: HR (filtered to requesting user)

**Included Fields**:
- All Org Directory fields
- Employment dates
- Role assignments
- Project assignments (current and historical)
- Leave balances (if tracked)

**Excluded Fields** (MUST NOT appear):
- Salary / compensation (even own)
- Performance evaluations
- Disciplinary records

**Access Rule**: Available only for the requesting user's own record.

#### 9.3.4 KnowledgeRepositoryView (Future)

**Purpose**: Provide institutional knowledge for organizational learning queries.

**Source Module**: Knowledge Repository (when implemented)

**Status**: Reserved for future implementation. This projection does not currently exist but is canonically planned.

**Access Rule** (anticipated): Available to authenticated users within RBAC boundaries, with potential scope restrictions based on knowledge classification.

### 9.4 Agent Inference Leakage Prevention

**A-001**: The Agent MUST NOT reveal:
- The existence of data the user cannot access
- Authorization rules or permission configurations
- Aggregations that reveal unauthorized record counts
- Field values from unauthorized records via correlation

**A-002**: When authorization prevents answering, the Agent responds: "אין לי גישה למידע זה." (I don't have access to this information.) — without explaining why.

**A-003**: The Agent MUST NOT process queries designed to enumerate permissions or probe authorization boundaries. Such queries are treated as refusals per P006 §6.3.

---

## 10. Matrix Governance

### 10.1 Data-Driven RBAC

The authorization matrix is **data-driven**, not code-driven:
- Role definitions are stored in the database
- Permission grants are stored in the database
- User-role assignments are stored in the database
- Changes take effect immediately upon database commit

There is no deployment required to modify RBAC configuration.

### 10.2 Authorized Editors

Only the following roles MAY modify RBAC configuration:
- **Owner**: Full RBAC administrative authority
- **Trust Officer**: RBAC administrative authority (except modifying Owner permissions)

**G-001**: Trust Officer MUST NOT modify permissions for the Owner role.

**G-002**: Trust Officer MUST NOT modify their own permissions (escalation prevention).

**G-003**: No other role may modify RBAC configuration.

### 10.3 Change Effectiveness

**G-004**: RBAC changes take effect **immediately** upon database commit.

**G-005**: Active sessions MUST re-evaluate permissions on next request. Session-cached permissions MUST NOT persist beyond request scope.

### 10.4 Rollback Capability

**G-006**: All RBAC changes MUST be logged with complete before/after state.

**G-007**: The system MUST support fast rollback of RBAC changes via revision history.

**G-008**: Rollback is itself an audited operation.

### 10.5 Governance Audit Requirements

Per DOC-008, the following RBAC operations generate audit records:

| Operation | Actor | Target | Required Fields |
|-----------|-------|--------|-----------------|
| Role definition create | Owner, Trust Officer | Role | Role ID, permissions, timestamp |
| Role definition modify | Owner, Trust Officer | Role | Before state, after state, timestamp |
| Role assignment | Owner, Trust Officer | User | User ID, previous roles, new roles, timestamp |
| Visibility Grant create | Owner, Trust Officer, Domain Head | Grant | Grantee, target project, grantor, timestamp |
| Visibility Grant revoke | Owner, Trust Officer, Domain Head | Grant | Grant ID, revoker, timestamp |
| Authorization failure | System | — | User, requested operation, target, timestamp |

---

## 11. User Interface Language Rule

### 11.1 Hebrew Requirement

**L-001**: All user-facing interface elements MUST be in **Hebrew (עברית)**.

This includes:
- Navigation menus
- Form labels
- Button text
- Validation messages
- Error messages
- Help text
- Confirmation dialogs
- Toast notifications
- Table headers
- Dropdown options
- Modal titles and content

**L-002**: There is no language switcher. The application operates exclusively in Hebrew.

### 11.2 RTL Layout

**L-003**: All UI layouts MUST be **right-to-left (RTL)**.

### 11.3 English Exceptions

The following may remain in English:
- Database field names (internal, not user-visible)
- API parameter names (developer interface)
- Code identifiers (internal)
- Canonical document IDs (e.g., DOC-013)
- Technical log entries (operator interface)
- Audit record field keys (internal)

**L-004**: Any user-visible rendering of these values MUST use Hebrew labels with English values where technically necessary.

### 11.4 Role Names

Role names have both English (technical) and Hebrew (display) forms per §4.1. The UI MUST display the Hebrew form exclusively.

---

## 12. Module Permission Summary Table

The following table summarizes role permissions by module for quick reference. See §7.3 for complete specifications.

| Role | Org Dir | HR | Projects | Events | Vendors | Vehicles | Equipment | Docs | Admin |
|------|---------|-----|----------|--------|---------|----------|-----------|------|-------|
| Owner | ALL | ALL | ALL | ALL | ALL | ALL | ALL | ALL | ALL |
| Executive | R | R | R,U | R,C,U | R,U | R | R | R | R |
| Trust Officer | R,U | ALL | R | R,C | R,C,U | ALL | ALL | ALL | R,U |
| Finance Officer | R | R* | R | R | R,U | R | R | R* | — |
| Domain Head | R | R:D† | R,U,C:D | R,C,U:D | R | R,U:D | R,U:D | R,C,U:D | — |
| Senior PM | R | R:P† | R,U:P+ | R,C,U,D:P | R | R | R | R,C,U:P | — |
| Proj Coordinator | R | R:S | R,U:P | R,C,U:P | R | R | R | R,C:P | — |
| Operations Staff | R | R:S | R:P | R,C:P | R | R | R | R:P | — |
| All Employees | R | R:S | R:P | R,C:P | R | R | R | R:P | — |

**Legend**:
- R = READ, C = CREATE, U = UPDATE, D = DELETE
- ALL = Full CRUD + ADMIN
- :S = SELF scope, :D = DOMAIN scope, :P = PROJECT scope, :P+ = PROJECT + Visibility Grants
- R* = Limited subset (compensation fields or financial docs only)
- † = HR Metadata only per §6.3 (excludes sensitive HR data)
- — = No access

---

## 13. Examples

### 13.1 Example: New Employee Onboarding

**Scenario**: Maya (Trust Officer) creates a new employee record for Yossi.

**Authorization Flow**:
1. Maya has `hr:CREATE:ALL` — authorized.
2. System creates employee record, assigns `all_employees` role automatically.
3. Maya assigns additional role `operations_staff` to Yossi.
4. Audit records: employee creation, role assignment.

**Yossi's effective permissions**: All Employees + Operations Staff (union).

### 13.2 Example: Project Knowledge Sharing

**Scenario**: Dani (Senior PM on Project Alpha) requests visibility to Project Beta for learning purposes.

**Authorization Flow**:
1. Dani's Domain Head (Project Beta's domain) receives request.
2. Domain Head creates Visibility Grant: grantee=Dani, target=Project Beta.
3. Audit record: Visibility Grant creation.
4. Dani can now query Project Beta via Agent using ProjectKnowledgeView.
5. Dani CANNOT create events on Project Beta (visibility ≠ authority).

### 13.3 Example: Agent Query with Scope Limitation

**Scenario**: Yossi (Operations Staff) asks the Agent: "מה השכר הממוצע בחברה?" (What is the average salary in the company?)

**Authorization Flow**:
1. Agent parses query, determines it requires HR salary data.
2. Yossi has `hr:READ:SELF` — no access to other employees' salary.
3. Agent responds: "אין לי גישה למידע זה."
4. Agent does NOT reveal that salary data exists or that others can access it.

### 13.4 Example: Unauthorized RBAC Modification Attempt

**Scenario**: A Project Coordinator attempts to modify role permissions via API.

**Authorization Flow**:
1. API receives request to modify role permissions.
2. Server checks: user role is `project_coordinator` — NOT in authorized editors (Owner, Trust Officer).
3. Request denied. Authorization failure audit record created.
4. HTTP 403 returned: "אין לך הרשאה לבצע פעולה זו."

### 13.5 Example: Domain Head HR Access Limitation

**Scenario**: Avi (Domain Head of Construction) queries HR data for employees in his domain.

**Authorization Flow**:
1. Avi has `hr:READ:DOMAIN` — authorized for domain personnel.
2. System returns **HR Metadata only**: names, titles, departments, project assignments, employment status.
3. System does NOT return: salary, contracts, evaluations, banking details.
4. Avi's query for "מה השכר של דני?" is denied — salary is not HR Metadata.

---

## 14. Compliance Checklist

The following checklist MUST be verified for RBAC compliance. All items MUST be true.

### 14.1 Foundational Checks

- [ ] **C-001**: Default authorization state is deny (no implicit grants exist)
- [ ] **C-002**: All authenticated users hold `all_employees` role
- [ ] **C-003**: Permission evaluation uses union-of-allows semantics
- [ ] **C-004**: All authorization decisions are server-side; no client-only enforcement
- [ ] **C-005**: Authorization is enforced identically across all access paths (UI, API, Agent, jobs)

### 14.2 Role & Scope Checks

- [ ] **C-006**: Only the nine official roles exist in the system
- [ ] **C-007**: Only the five official scopes exist in the system
- [ ] **C-008**: Role-permission mappings match §7.3 specifications
- [ ] **C-009**: Role assignment requires authorized administrator (Owner, Trust Officer)
- [ ] **C-010**: Scope resolution occurs at query time, not cached beyond request

### 14.3 Module Separation Checks

- [ ] **C-011**: Org Directory and HR are separate modules
- [ ] **C-012**: Org Directory contains only directory-safe fields per §6.2
- [ ] **C-013**: HR contains sensitive fields with appropriate access restrictions
- [ ] **C-014**: Agent CANNOT access HR module (absolute prohibition)
- [ ] **C-015**: HR READ with DOMAIN/PROJECT scope returns HR Metadata only per §6.3

### 14.4 Visibility Grant Checks

- [ ] **C-016**: Visibility Grants are explicit, not automatic
- [ ] **C-017**: Visibility Grants enable read-only access only
- [ ] **C-018**: Visibility Grant creation is restricted to authorized grantors
- [ ] **C-019**: All Visibility Grant operations are audited

### 14.5 Agent Checks

- [ ] **C-020**: Agent accesses data only through official Projections
- [ ] **C-021**: Agent is read-only (no create, update, delete operations)
- [ ] **C-022**: Agent operates within requesting user's authorization context
- [ ] **C-023**: Agent does not reveal existence of unauthorized data

### 14.6 Governance Checks

- [ ] **C-024**: RBAC configuration is data-driven (database, not code)
- [ ] **C-025**: Only Owner and Trust Officer can modify RBAC configuration
- [ ] **C-026**: Trust Officer cannot modify Owner permissions or own permissions
- [ ] **C-027**: RBAC changes take effect immediately
- [ ] **C-028**: All RBAC changes are logged with before/after state
- [ ] **C-029**: Rollback capability exists for RBAC changes

### 14.7 UI Language Checks

- [ ] **C-030**: All user-facing UI text is in Hebrew
- [ ] **C-031**: Layout is right-to-left (RTL)
- [ ] **C-032**: Role names display in Hebrew form

### 14.8 Audit Checks

- [ ] **C-033**: All authorization failures are logged
- [ ] **C-034**: All permission changes are logged
- [ ] **C-035**: All role assignments are logged
- [ ] **C-036**: Audit logs are immutable

### 14.9 Knowledge Repository Checks (Future)

- [ ] **C-037**: Knowledge Repository module exists as canonical placeholder
- [ ] **C-038**: Knowledge Repository is not split into sub-modules

---

## 15. Scope Boundaries

### 15.1 In Scope

- Official role definitions for v1
- Official scope definitions for v1
- Module permission matrix
- Visibility Grant specification
- Agent projection definitions
- RBAC governance rules
- UI language requirements
- Compliance checklist
- Knowledge Repository as canonical placeholder module

### 15.2 Explicitly Out of Scope

- Authentication mechanisms (see DOC-005)
- RBAC implementation code (engineering concern)
- Database schema for RBAC tables (see DOC-010)
- Admin UI wireframes (product/UX concern)
- Specific audit log formats (see DOC-008)
- Knowledge Repository implementation details (deferred)
- Knowledge Repository permission matrix (deferred until implementation)

### 15.3 Intentionally Excluded

The following RBAC patterns are explicitly rejected:

| Pattern | Reason for Rejection |
|---------|---------------------|
| Implicit inheritance through role hierarchy | Violates explicit grant principle |
| User-to-permission direct grants | Violates role-based model (DOC-006 §2.1) |
| Deny permissions that override grants | Adds complexity; union-of-allows is sufficient |
| Custom user-defined roles | Deferred to future version; v1 uses fixed roles |
| Time-bounded elevated access | Deferred to future version |
| Permission caching beyond request scope | Violates freshness requirement |
| Agent write access under any condition | Violates DOC-001 §3.3 (permanent read-only) |
| Knowledge Repository sub-modules | Single unified module required |

---

## 16. Relationship to Canonical Baseline

### 16.1 Foundation Document

This document extends **DOC-006 (Authorization Model & RBAC Specification)**. DOC-006 defines the framework; this document defines the operational configuration.

### 16.2 Conformance Requirements

This document conforms to:
- **DOC-001**: System Identity (Agent read-only constraint §3.3)
- **DOC-002**: Authority, Trust & Decision Boundaries
- **DOC-005**: Security, Privacy & Data Handling (data classification alignment)
- **DOC-006**: Authorization Model & RBAC Specification (foundational framework)
- **DOC-008**: Observability & Audit Trail Policy (audit requirements)
- **DOC-010**: Data Model & Database Constitution

### 16.3 Product Canon Alignment

This document informs but does not override:
- **P002**: User Types, Roles & Personas (role mapping)
- **P006**: AI / Agent Product Behavior Policy (Agent behavior)

Per DOC-000 §5.1, Technical Canon prevails over Product Canon. Product Canon documents must conform to the specifications in this document.

---

## 17. Amendment Process

### 17.1 Amendment Authority

Amendments to this document require:
- Documented justification
- Security review
- CTO or Product Owner approval
- Version increment per DOC-000 §3.4

### 17.2 Role/Permission Changes

Adding, modifying, or removing roles or permissions requires:
- This document to be amended first
- Implementation to follow documented specification
- Verification against Compliance Checklist (§14)

### 17.3 Versioning

Role and scope additions are minor version changes (v1.0 → v1.1).
Role or scope removals are major version changes (v1.0 → v2.0).

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v1.0 | 2026-01-25 11:32:01 CST | Claude (acting CTO) | Initial pre-canonical draft establishing v1 RBAC Matrix with roles, scopes, modules, visibility grants, agent projections, governance rules, UI language policy, and compliance checklist |
| v1.1 | 2026-01-25 11:37:13 CST | Claude (acting CTO) | Clarified HR scope semantics (§6.3, §7.3.5, §7.3.6), added Knowledge Repository placeholder module (§6.1, §6.4, §9.3.4, §15), and baseline event logging justification (§7.2) |

---

End of Document
