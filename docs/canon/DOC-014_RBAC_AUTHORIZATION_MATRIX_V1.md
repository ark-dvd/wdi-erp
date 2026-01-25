---
Canonical Document ID: DOC-014
Document Title: RBAC Authorization Matrix v1
Document Type: Canonical
Status: Pre-Canonical
Baseline Reference: Extends Canonical Baseline v1.2
Source Document: DOC-013 (RBAC Authorization Matrix & Operational Policy v1.1)
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Signatory: Chief Technology Officer (CTO)
Timezone: America/Chicago (CST)
Created At: 2026-01-25 12:26:18 CST
Last Updated: 2026-01-25 12:26:18 CST
Current Version: v1.0
---

# DOC-014 — RBAC Authorization Matrix v1

---

## 1. Purpose

### 1.1 Document Intent

This document is the **exhaustive, auditable rendering** of the RBAC Authorization Matrix for the WDI ERP system as defined in DOC-013.

This document does NOT define policy. It renders the matrix in two complementary representations for operational reference, compliance verification, and implementation guidance.

### 1.2 Authority Relationship

This document is a **derivative artifact** of DOC-013 (RBAC Authorization Matrix & Operational Policy v1.1). All permissions, roles, scopes, and modules enumerated herein are derived exclusively from DOC-013.

If any discrepancy exists between this document and DOC-013, **DOC-013 prevails unconditionally**.

### 1.3 References

| Document | Relationship |
|----------|--------------|
| DOC-013 | Source of truth for all matrix content |
| DOC-006 | Foundation authorization framework |
| DOC-008 | Audit trail requirements |
| P006 | Agent behavior policy |

---

## 2. How to Read This Matrix

### 2.1 Permission Format

All permissions follow the format: `{module}:{operation}:{scope}`

| Component | Description |
|-----------|-------------|
| `module` | System module identifier (e.g., `projects`, `hr`, `events`) |
| `operation` | Action type: `READ`, `CREATE`, `UPDATE`, `DELETE`, `ADMIN`, `QUERY` |
| `scope` | Data boundary: `ALL`, `DOMAIN`, `PROJECT`, `OWN`, `SELF` |

### 2.2 Default Authorization State

**Default = DENY**

Any permission not explicitly listed in this matrix is DENIED. Absence of a grant is denial of access.

### 2.3 Permission Evaluation

**Union-of-Allows**: When a user holds multiple roles, permissions are evaluated as the union of all grants. If any role grants the permission, access is allowed. There are no deny overrides.

### 2.4 Scope Definitions

| Scope | Definition |
|-------|------------|
| `ALL` | Unrestricted access to all instances within the organization |
| `DOMAIN` | Access limited to entities within the user's assigned functional domain(s) |
| `PROJECT` | Access limited to entities associated with projects where the user is assigned OR has explicit Visibility Grant |
| `OWN` | Access limited to entities created by or explicitly assigned to the user |
| `SELF` | Access limited to the user's own personal record only |

### 2.5 PROJECT Scope Rules

The `PROJECT` scope includes two access paths:

| Access Path | Description |
|-------------|-------------|
| **Assignment** | User is directly assigned to the project |
| **Visibility Grant** | User has received an explicit, revocable Visibility Grant for read-only access |

Visibility Grants enable READ operations only. CREATE, UPDATE, DELETE, and ADMIN operations require direct assignment.

### 2.6 HR Scope Limitation (Critical)

**HR READ with DOMAIN or PROJECT scope is LIMITED TO HR METADATA ONLY.**

HR Metadata includes: employee name, job title, department/domain assignment, project assignments, employment status.

HR Metadata **excludes**: salary, compensation, contracts, evaluations, disciplinary records, banking details, government ID, home address, personal contact, medical accommodations.

Only HR READ with ALL scope (Owner, Executive, Trust Officer, Finance Officer) provides access to sensitive HR fields.

---

## 3. Role-Centric Authorization Matrix

### 3.1 Owner (בעלים)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | — |
| `org_directory` | ספר הארגון | CREATE | ALL | — |
| `org_directory` | ספר הארגון | UPDATE | ALL | — |
| `org_directory` | ספר הארגון | DELETE | ALL | — |
| `org_directory` | ספר הארגון | ADMIN | ALL | — |
| `hr` | משאבי אנוש | READ | ALL | Full sensitive HR access |
| `hr` | משאבי אנוש | CREATE | ALL | — |
| `hr` | משאבי אנוש | UPDATE | ALL | — |
| `hr` | משאבי אנוש | DELETE | ALL | — |
| `hr` | משאבי אנוש | ADMIN | ALL | — |
| `projects` | פרויקטים | READ | ALL | — |
| `projects` | פרויקטים | CREATE | ALL | — |
| `projects` | פרויקטים | UPDATE | ALL | — |
| `projects` | פרויקטים | DELETE | ALL | — |
| `projects` | פרויקטים | ADMIN | ALL | — |
| `events` | אירועים | READ | ALL | — |
| `events` | אירועים | CREATE | ALL | — |
| `events` | אירועים | UPDATE | ALL | — |
| `events` | אירועים | DELETE | ALL | — |
| `events` | אירועים | ADMIN | ALL | — |
| `vendors` | ספקים | READ | ALL | — |
| `vendors` | ספקים | CREATE | ALL | — |
| `vendors` | ספקים | UPDATE | ALL | — |
| `vendors` | ספקים | DELETE | ALL | — |
| `vendors` | ספקים | ADMIN | ALL | — |
| `vehicles` | רכבים | READ | ALL | — |
| `vehicles` | רכבים | CREATE | ALL | — |
| `vehicles` | רכבים | UPDATE | ALL | — |
| `vehicles` | רכבים | DELETE | ALL | — |
| `vehicles` | רכבים | ADMIN | ALL | — |
| `equipment` | ציוד | READ | ALL | — |
| `equipment` | ציוד | CREATE | ALL | — |
| `equipment` | ציוד | UPDATE | ALL | — |
| `equipment` | ציוד | DELETE | ALL | — |
| `equipment` | ציוד | ADMIN | ALL | — |
| `documents` | מסמכים | READ | ALL | — |
| `documents` | מסמכים | CREATE | ALL | — |
| `documents` | מסמכים | UPDATE | ALL | — |
| `documents` | מסמכים | DELETE | ALL | — |
| `documents` | מסמכים | ADMIN | ALL | — |
| `admin` | ניהול מערכת | READ | ALL | — |
| `admin` | ניהול מערכת | CREATE | ALL | — |
| `admin` | ניהול מערכת | UPDATE | ALL | Full RBAC administration |
| `admin` | ניהול מערכת | DELETE | ALL | — |
| `admin` | ניהול מערכת | ADMIN | ALL | — |
| `agent` | סוכן WDI | QUERY | — | Via all projections |

**Everything else: DENIED**

---

### 3.2 Executive (מנכ"ל)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Via DirectorySafeView |
| `hr` | משאבי אנוש | READ | ALL | Full sensitive HR access |
| `projects` | פרויקטים | READ | ALL | Via ProjectKnowledgeView |
| `projects` | פרויקטים | UPDATE | ALL | — |
| `events` | אירועים | READ | ALL | — |
| `events` | אירועים | CREATE | ALL | — |
| `events` | אירועים | UPDATE | ALL | — |
| `vendors` | ספקים | READ | ALL | — |
| `vendors` | ספקים | UPDATE | ALL | — |
| `vehicles` | רכבים | READ | ALL | — |
| `equipment` | ציוד | READ | ALL | — |
| `documents` | מסמכים | READ | ALL | — |
| `admin` | ניהול מערכת | READ | — | Read-only admin visibility |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView, MyProfileView |

**Everything else: DENIED**

---

### 3.3 Trust Officer (מנהל משרד)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Via DirectorySafeView |
| `org_directory` | ספר הארגון | UPDATE | ALL | — |
| `hr` | משאבי אנוש | READ | ALL | Full sensitive HR access |
| `hr` | משאבי אנוש | CREATE | ALL | — |
| `hr` | משאבי אנוש | UPDATE | ALL | — |
| `hr` | משאבי אנוש | DELETE | ALL | — |
| `projects` | פרויקטים | READ | ALL | Via ProjectKnowledgeView |
| `events` | אירועים | READ | ALL | — |
| `events` | אירועים | CREATE | ALL | — |
| `vendors` | ספקים | READ | ALL | — |
| `vendors` | ספקים | CREATE | ALL | — |
| `vendors` | ספקים | UPDATE | ALL | — |
| `vehicles` | רכבים | READ | ALL | — |
| `vehicles` | רכבים | CREATE | ALL | — |
| `vehicles` | רכבים | UPDATE | ALL | — |
| `vehicles` | רכבים | DELETE | ALL | — |
| `equipment` | ציוד | READ | ALL | — |
| `equipment` | ציוד | CREATE | ALL | — |
| `equipment` | ציוד | UPDATE | ALL | — |
| `equipment` | ציוד | DELETE | ALL | — |
| `documents` | מסמכים | READ | ALL | — |
| `documents` | מסמכים | CREATE | ALL | — |
| `documents` | מסמכים | UPDATE | ALL | — |
| `documents` | מסמכים | DELETE | ALL | — |
| `admin` | ניהול מערכת | READ | — | — |
| `admin` | ניהול מערכת | UPDATE | — | RBAC admin (cannot modify Owner or own permissions) |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView, MyProfileView |

**Everything else: DENIED**

---

### 3.4 Finance Officer (מנהל כספים)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Via DirectorySafeView |
| `hr` | משאבי אנוש | READ | ALL | Compensation fields only |
| `projects` | פרויקטים | READ | ALL | Via ProjectKnowledgeView |
| `events` | אירועים | READ | ALL | — |
| `vendors` | ספקים | READ | ALL | — |
| `vendors` | ספקים | UPDATE | ALL | — |
| `vehicles` | רכבים | READ | ALL | — |
| `equipment` | ציוד | READ | ALL | — |
| `documents` | מסמכים | READ | ALL | Financial documents |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView, MyProfileView |

**Everything else: DENIED**

---

### 3.5 Domain Head (ראש תחום)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Via DirectorySafeView |
| `hr` | משאבי אנוש | READ | DOMAIN | **HR Metadata only** — excludes salary, contracts, evaluations |
| `projects` | פרויקטים | READ | DOMAIN | Via ProjectKnowledgeView |
| `projects` | פרויקטים | CREATE | DOMAIN | — |
| `projects` | פרויקטים | UPDATE | DOMAIN | — |
| `events` | אירועים | READ | DOMAIN | — |
| `events` | אירועים | CREATE | DOMAIN | — |
| `events` | אירועים | UPDATE | DOMAIN | — |
| `vendors` | ספקים | READ | ALL | — |
| `vehicles` | רכבים | READ | DOMAIN | Vehicles assigned to domain |
| `vehicles` | רכבים | UPDATE | DOMAIN | — |
| `equipment` | ציוד | READ | DOMAIN | — |
| `equipment` | ציוד | UPDATE | DOMAIN | — |
| `documents` | מסמכים | READ | DOMAIN | — |
| `documents` | מסמכים | CREATE | DOMAIN | — |
| `documents` | מסמכים | UPDATE | DOMAIN | — |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView (domain), MyProfileView |

**Everything else: DENIED**

---

### 3.6 Senior PM (מנהל פרויקט בכיר)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Via DirectorySafeView |
| `hr` | משאבי אנוש | READ | PROJECT | **HR Metadata only** — excludes salary, contracts, evaluations |
| `projects` | פרויקטים | READ | PROJECT | Includes Visibility Grants; via ProjectKnowledgeView |
| `projects` | פרויקטים | UPDATE | PROJECT | Assigned projects only (Visibility Grants = READ only) |
| `events` | אירועים | READ | PROJECT | — |
| `events` | אירועים | CREATE | PROJECT | — |
| `events` | אירועים | UPDATE | PROJECT | — |
| `events` | אירועים | DELETE | PROJECT | — |
| `vendors` | ספקים | READ | ALL | — |
| `vehicles` | רכבים | READ | ALL | — |
| `equipment` | ציוד | READ | ALL | — |
| `documents` | מסמכים | READ | PROJECT | — |
| `documents` | מסמכים | CREATE | PROJECT | — |
| `documents` | מסמכים | UPDATE | PROJECT | — |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView, MyProfileView |

**Everything else: DENIED**

---

### 3.7 Project Coordinator (רכז פרויקט)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Via DirectorySafeView |
| `hr` | משאבי אנוש | READ | SELF | Own HR record only; via MyProfileView |
| `projects` | פרויקטים | READ | PROJECT | Assigned projects only; via ProjectKnowledgeView |
| `projects` | פרויקטים | UPDATE | PROJECT | Assigned projects only |
| `events` | אירועים | READ | PROJECT | — |
| `events` | אירועים | CREATE | PROJECT | — |
| `events` | אירועים | UPDATE | PROJECT | — |
| `vendors` | ספקים | READ | ALL | — |
| `vehicles` | רכבים | READ | ALL | — |
| `equipment` | ציוד | READ | ALL | — |
| `documents` | מסמכים | READ | PROJECT | — |
| `documents` | מסמכים | CREATE | PROJECT | — |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView, MyProfileView |

**Everything else: DENIED**

---

### 3.8 Operations Staff (צוות תפעול)

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Via DirectorySafeView |
| `hr` | משאבי אנוש | READ | SELF | Own HR record only; via MyProfileView |
| `projects` | פרויקטים | READ | PROJECT | Assigned projects only; via ProjectKnowledgeView |
| `events` | אירועים | READ | PROJECT | — |
| `events` | אירועים | CREATE | PROJECT | Field-level operational logging |
| `vendors` | ספקים | READ | ALL | — |
| `vehicles` | רכבים | READ | ALL | — |
| `equipment` | ציוד | READ | ALL | — |
| `documents` | מסמכים | READ | PROJECT | — |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView, MyProfileView |

**Everything else: DENIED**

---

### 3.9 All Employees (כל העובדים)

This is the **baseline role** automatically assigned to every authenticated user.

| Module ID | Module Name (HE) | Operation | Scope | Notes |
|-----------|------------------|-----------|-------|-------|
| `org_directory` | ספר הארגון | READ | ALL | Directory-safe fields only; via DirectorySafeView |
| `hr` | משאבי אנוש | READ | SELF | Own HR record only; via MyProfileView |
| `projects` | פרויקטים | READ | PROJECT | Assigned projects only; via ProjectKnowledgeView |
| `events` | אירועים | READ | PROJECT | — |
| `events` | אירועים | CREATE | PROJECT | Field-level operational logging for traceability |
| `vendors` | ספקים | READ | ALL | Vendor contact lookup |
| `vehicles` | רכבים | READ | ALL | Fleet visibility |
| `equipment` | ציוד | READ | ALL | Equipment visibility |
| `documents` | מסמכים | READ | PROJECT | Documents attached to assigned projects |
| `agent` | סוכן WDI | QUERY | — | Via DirectorySafeView, ProjectKnowledgeView, MyProfileView |

**Everything else: DENIED**

---

## 4. Module-Centric Authorization Matrix

### 4.1 org_directory (ספר הארגון)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer, Finance Officer, Domain Head, Senior PM, Project Coordinator, Operations Staff, All Employees | Via DirectorySafeView; directory-safe fields only |
| CREATE | ALL | Owner | — |
| UPDATE | ALL | Owner, Trust Officer | — |
| DELETE | ALL | Owner | — |
| ADMIN | ALL | Owner | — |

---

### 4.2 hr (משאבי אנוש)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer | Full sensitive HR access |
| READ | ALL | Finance Officer | Compensation fields only |
| READ | DOMAIN | Domain Head | **HR Metadata only** |
| READ | PROJECT | Senior PM | **HR Metadata only** |
| READ | SELF | Project Coordinator, Operations Staff, All Employees | Own record only; via MyProfileView |
| CREATE | ALL | Owner, Trust Officer | — |
| UPDATE | ALL | Owner, Trust Officer | — |
| DELETE | ALL | Owner, Trust Officer | — |
| ADMIN | ALL | Owner | — |

**Agent access to HR: ABSOLUTELY PROHIBITED**

---

### 4.3 projects (פרויקטים)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer, Finance Officer | Via ProjectKnowledgeView |
| READ | DOMAIN | Domain Head | Via ProjectKnowledgeView |
| READ | PROJECT | Senior PM | Includes Visibility Grants; via ProjectKnowledgeView |
| READ | PROJECT | Project Coordinator, Operations Staff, All Employees | Assigned projects only; via ProjectKnowledgeView |
| CREATE | ALL | Owner | — |
| CREATE | DOMAIN | Domain Head | — |
| UPDATE | ALL | Owner, Executive | — |
| UPDATE | DOMAIN | Domain Head | — |
| UPDATE | PROJECT | Senior PM, Project Coordinator | Senior PM: assigned only (Visibility = READ) |
| DELETE | ALL | Owner | — |
| ADMIN | ALL | Owner | — |

---

### 4.4 events (אירועים)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer, Finance Officer | — |
| READ | DOMAIN | Domain Head | — |
| READ | PROJECT | Senior PM, Project Coordinator, Operations Staff, All Employees | — |
| CREATE | ALL | Owner, Executive, Trust Officer | — |
| CREATE | DOMAIN | Domain Head | — |
| CREATE | PROJECT | Senior PM, Project Coordinator, Operations Staff, All Employees | Field-level operational logging |
| UPDATE | ALL | Owner, Executive | — |
| UPDATE | DOMAIN | Domain Head | — |
| UPDATE | PROJECT | Senior PM, Project Coordinator | — |
| DELETE | ALL | Owner | — |
| DELETE | PROJECT | Senior PM | — |
| ADMIN | ALL | Owner | — |

---

### 4.5 vendors (ספקים)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer, Finance Officer, Domain Head, Senior PM, Project Coordinator, Operations Staff, All Employees | Vendor contact lookup |
| CREATE | ALL | Owner, Trust Officer | — |
| UPDATE | ALL | Owner, Executive, Trust Officer, Finance Officer | — |
| DELETE | ALL | Owner | — |
| ADMIN | ALL | Owner | — |

---

### 4.6 vehicles (רכבים)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer, Finance Officer, Senior PM, Project Coordinator, Operations Staff, All Employees | Fleet visibility |
| READ | DOMAIN | Domain Head | Vehicles assigned to domain |
| CREATE | ALL | Owner, Trust Officer | — |
| UPDATE | ALL | Owner, Trust Officer | — |
| UPDATE | DOMAIN | Domain Head | — |
| DELETE | ALL | Owner, Trust Officer | — |
| ADMIN | ALL | Owner | — |

---

### 4.7 equipment (ציוד)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer, Finance Officer, Senior PM, Project Coordinator, Operations Staff, All Employees | Equipment visibility |
| READ | DOMAIN | Domain Head | — |
| CREATE | ALL | Owner, Trust Officer | — |
| UPDATE | ALL | Owner, Trust Officer | — |
| UPDATE | DOMAIN | Domain Head | — |
| DELETE | ALL | Owner, Trust Officer | — |
| ADMIN | ALL | Owner | — |

---

### 4.8 documents (מסמכים)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | ALL | Owner, Executive, Trust Officer | — |
| READ | ALL | Finance Officer | Financial documents |
| READ | DOMAIN | Domain Head | — |
| READ | PROJECT | Senior PM, Project Coordinator, Operations Staff, All Employees | Documents attached to assigned projects |
| CREATE | ALL | Owner, Trust Officer | — |
| CREATE | DOMAIN | Domain Head | — |
| CREATE | PROJECT | Senior PM, Project Coordinator | — |
| UPDATE | ALL | Owner, Trust Officer | — |
| UPDATE | DOMAIN | Domain Head | — |
| UPDATE | PROJECT | Senior PM | — |
| DELETE | ALL | Owner, Trust Officer | — |
| ADMIN | ALL | Owner | — |

---

### 4.9 admin (ניהול מערכת)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| READ | — | Owner, Executive, Trust Officer | Admin visibility |
| CREATE | ALL | Owner | — |
| UPDATE | ALL | Owner | Full RBAC administration |
| UPDATE | — | Trust Officer | Cannot modify Owner or own permissions |
| DELETE | ALL | Owner | — |
| ADMIN | ALL | Owner | — |

---

### 4.10 agent (סוכן WDI)

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| QUERY | — | Owner, Executive, Trust Officer, Finance Officer, Domain Head, Senior PM, Project Coordinator, Operations Staff, All Employees | Read-only queries within user authorization context |

**Agent is permanently READ-ONLY. The Agent MUST NEVER perform CREATE, UPDATE, or DELETE operations.**

---

### 4.11 knowledge_repository (מאגר המידע)

**Status: Canonical Placeholder**

This module is canonically defined but not yet implemented. Full permission matrix coverage is deferred until implementation.

| Operation | Scope | Roles Granted | Notes |
|-----------|-------|---------------|-------|
| — | — | — | Permissions deferred pending implementation |

**Future Agent Access**: The Agent MAY consume Knowledge Repository data via curated projections (KnowledgeRepositoryView) within RBAC boundaries when implemented. This does not grant automatic access.

**No Sub-Modules**: The Knowledge Repository MUST remain a single unified module.

---

## 5. Agent Authorization Matrix

### 5.1 Agent Principles

The WDI Agent:
- **MUST** operate within the requesting user's authorization context
- **MUST** access data exclusively through curated Projections
- **MUST** be permanently READ-ONLY
- **MUST NOT** access raw database tables
- **MUST NOT** reveal existence of unauthorized data

### 5.2 Projection Access Matrix

| Projection | Source Module | Roles with Access | Access Condition |
|------------|---------------|-------------------|------------------|
| DirectorySafeView | org_directory | All roles | All authenticated users |
| ProjectKnowledgeView | projects, events, vendors | All roles | Projects where user is assigned OR has Visibility Grant |
| MyProfileView | hr (filtered) | All roles | Own record only |
| KnowledgeRepositoryView | knowledge_repository | — | Future; not implemented |

### 5.3 DirectorySafeView

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

### 5.4 ProjectKnowledgeView

**Included Fields**:
- Project UUID and name
- Project status
- Project domain
- Key milestones (dates only)
- Event summaries (type, date, description)
- Assigned personnel (names only, via DirectorySafeView)
- Associated vendors (organization names and contact names)

**Excluded Fields** (MUST NOT appear):
- Financial details (budget, costs, margins)
- Internal assessment notes
- Vendor contract terms
- Personnel compensation

**Access Rule**: User must have direct assignment OR Visibility Grant.

### 5.5 MyProfileView

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

**Access Rule**: Own record only.

### 5.6 KnowledgeRepositoryView (Future)

**Status**: Reserved for future implementation.

**Anticipated Access**: Authenticated users within RBAC boundaries.

### 5.7 Absolute Prohibition

**The Agent MUST NEVER access HR sensitive data under any circumstances.**

**The Agent is READ-ONLY.**

---

## 6. Project Visibility Grants

### 6.1 Normative Statements

**V-001**: Visibility ≠ Authority.

**V-002**: Visibility Grants allow **READ-ONLY** access via ProjectKnowledgeView.

**V-003**: Visibility Grants MUST NOT enable:
- CREATE operations
- UPDATE operations
- DELETE operations
- APPROVE operations
- Resource assignment
- Administrative actions

**V-004**: Visibility Grants are:
- Explicit (not automatic)
- Revocable
- Auditable

**V-005**: Visibility Grants do not grant HR access. Only directory-safe information (via Org Directory / DirectorySafeView) is accessible for personnel on visible projects.

### 6.2 Grant Authorization

| Grantor Role | May Grant Visibility To |
|--------------|-------------------------|
| Owner | Any project |
| Trust Officer | Any project |
| Domain Head | Projects within their domain |

### 6.3 Grant Lifecycle

1. **Activation**: Grant recorded; takes effect immediately
2. **Usage**: Grantee accesses via ProjectKnowledgeView (READ only)
3. **Revocation**: Administrator revokes OR user offboarded

All lifecycle events MUST be audited per DOC-008.

---

## 7. Knowledge Repository (Canonical Placeholder)

### 7.1 Module Status

| Property | Value |
|----------|-------|
| Module ID | `knowledge_repository` |
| Module Name (HE) | מאגר המידע |
| Status | Canonical Placeholder |
| Implementation | Deferred |

### 7.2 Conceptual Content

- Tenders (participated and not participated)
- Standards and specifications
- General specifications (non-project-specific)
- Internal knowledge assets
- Lessons learned (non-project-bound)

### 7.3 Normative Constraints

**KR-001**: The Knowledge Repository MUST remain a single unified module. Sub-modules are prohibited.

**KR-002**: Full permission matrix coverage is deferred until implementation.

**KR-003**: When implemented, permissions MUST follow the RBAC patterns established in DOC-013.

**KR-004**: Future Agent access MUST be projection-based (KnowledgeRepositoryView) and RBAC-bound.

---

## 8. Compliance Reference

This matrix renders the permissions defined in DOC-013. Verification against the DOC-013 Compliance Checklist (§14) is required for implementation conformance.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v1.0 | 2026-01-25 12:26:18 CST | Claude (acting CTO) | Initial canonical matrix rendering from DOC-013 v1.1 |

---

End of Document
