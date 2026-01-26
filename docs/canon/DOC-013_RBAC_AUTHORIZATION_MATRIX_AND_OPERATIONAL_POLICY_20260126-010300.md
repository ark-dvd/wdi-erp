---
Canonical Document ID: DOC-013
Document Title: RBAC Authorization Matrix & Operational Policy
Document Type: Canonical
Status: Canonical
Baseline Reference: Extends Canonical Baseline v1.2
Foundation Document: DOC-006 (Authorization Model & RBAC Specification)
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Signatory: Chief Technology Officer (CTO)
Timezone: America/Chicago (CST)
Created At: 2026-01-25 11:32:01 CST
Last Updated: 2026-01-26 01:03:00 CST
Current Version: v2.0
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
| **Role** | A named collection of permissions representing a job function or access profile. Users are assigned exactly one role at any time. |
| **Scope** | A boundary that limits the extent of a permission grant. Scopes define *what data* a permission applies to. |
| **Module** | A functional area of the system with its own data entities and access patterns. |
| **Permission** | An explicit grant allowing a specific operation on data within a defined scope. |
| **Main Page (דף ראשי)** | The list/table view of a module showing limited, summary information. |
| **Card (כרטיסייה)** | The detailed individual record view with full information for that entity. |

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

### 3.2 Single Role Assignment

Users hold exactly **one role** at any time. Roles are mutually exclusive and represent the user's current job function.

### 3.3 Server-Side Authority

All authorization decisions are made server-side. Client-side permission checks are UX conveniences with no security value. The server is the sole authority.

### 3.4 Uniform Enforcement

Authorization is enforced identically across all access paths: UI, API, background jobs, Agent queries, internal service calls. No path receives implicit trust or relaxed enforcement.

### 3.5 Audit Trail Requirement

All permission changes, role assignments, and authorization failures MUST be logged per DOC-008. Audit trails are immutable and cannot be bypassed.

### 3.6 Read vs Write Scope Separation

A role may have **broader read access** than write access. For example, a user may view all projects company-wide but only update projects assigned to them.

---

## 4. Official Roles (v2)

### 4.1 Role Enumeration

The system defines exactly ten (10) official roles:

| Role ID | Role Name (EN) | Role Name (HE) | Description |
|---------|----------------|----------------|-------------|
| `owner` | Owner | בעלים | Organization owner with unrestricted system access. Ultimate authority. |
| `executive` | Executive / CEO | מנכ״ל | Executive leadership with full operational visibility and control. |
| `trust_officer` | Trust Officer | מנהל/ת משרד | Office Manager / HR-Ops coordinator. Administrative and personnel authority. |
| `pmo` | PMO | PMO | Project Management Office. Cross-project visibility for coordination and reporting. |
| `finance_officer` | Finance Officer | מנהל כספים | Financial operations oversight and control. |
| `domain_head` | Domain Head | ראש תחום | Head of a functional domain (e.g., Construction, Infrastructure). |
| `project_manager` | Project Manager | מנהל פרויקט | Project management with responsibility for assigned projects. |
| `project_coordinator` | Project Coordinator | מתאם פרויקט | Project-level coordination and operational tasks. |
| `administration` | Administration | אדמיניסטרציה | Administrative staff handling equipment, vehicles, vendors, and contacts. |
| `all_employees` | All Employees | כל העובדים | Temporary baseline role for newly onboarded employees. |

### 4.2 Role Assignment Rules

**R-001**: New employees are assigned `all_employees` upon onboarding. This is a **temporary** role.

**R-002**: `all_employees` is expected to be replaced with an appropriate role within hours or days of onboarding.

**R-003**: Users hold exactly **one role** at any time. Role changes replace the previous role entirely.

**R-004**: Role assignment MUST be performed by an authorized administrator (Owner or Trust Officer) and MUST be logged.

**R-005**: Role assignment takes effect immediately upon commitment to the database. There is no propagation delay.

**R-006**: Role changes MUST generate audit records capturing: actor, target user, previous role, new role, timestamp, and reason (if provided).

### 4.3 Role Hierarchy (Administrative Only)

Roles do not form a permission hierarchy. However, the following precedence applies for administrative scope:

```
Owner
  ↓
Executive / CEO
  ↓
Trust Officer / Finance Officer (peer level)
  ↓
PMO / Domain Head (peer level)
  ↓
Project Manager
  ↓
Project Coordinator
  ↓
Administration
  ↓
All Employees (temporary baseline)
```

Higher roles do not inherit lower role permissions. The hierarchy affects administrative authority only (who can assign roles to whom).

---

## 5. Official Scopes (v2)

### 5.1 Scope Enumeration

The system defines the following scopes:

| Scope ID | Scope Name | Definition |
|----------|------------|------------|
| `ALL` | All | Unrestricted access to all instances of the entity type. |
| `DOMAIN` | Domain | Access limited to entities within the user's assigned functional domain. |
| `ASSIGNED` | Assigned | Access limited to entities explicitly assigned to the user (projects, tasks). |
| `OWN` | Own | Access limited to entities created by or personally assigned to the user (equipment, vehicles). |
| `SELF` | Self | Access limited to the user's own personal record (HR card). |
| `MAIN_PAGE` | Main Page | Read access to summary/list view only, not individual cards. |

### 5.2 Scope Semantics

**S-001**: READ scope may be broader than WRITE scope for the same module.

**S-002**: `MAIN_PAGE` scope grants visibility to the module's list view but not to individual record details.

**S-003**: `SELF` scope applies exclusively to the user's own records (HR card, personal equipment, personal vehicle).

**S-004**: `ASSIGNED` scope includes projects where user is explicitly assigned as manager, coordinator, or team member.

---

## 6. System Modules

### 6.1 Module Enumeration

The system is organized into the following modules:

| Module ID | Module Name (HE) | Description | Status |
|-----------|------------------|-------------|--------|
| `events` | יומן אירועים | Operational event journal. | Active |
| `projects` | פרויקטים | Project hierarchy, status, timeline, assignments. | Active |
| `hr` | כח אדם | Personnel data: employee records, contacts, documents. | Active |
| `contacts` | אנשי קשר | External contacts (non-employee). | Active |
| `vendors` | דירוג ספקים | Vendor organizations, ratings, relationships. | Active |
| `equipment` | ציוד | Asset management: equipment items, assignments. | Active |
| `vehicles` | רכבים | Fleet management: vehicles, assignments, status. | Active |
| `knowledge_repository` | מאגר מידע | Organization-wide institutional knowledge. | Active |
| `financial` | פיננסי | Financial data and reporting. | Placeholder |
| `agent` | WDI Agent | AI-powered query interface. | Active |
| `admin` | Admin Console | System configuration, user management, RBAC. | Active |

### 6.2 HR Module: Main Page vs Card Distinction

**M-001**: The HR module has two access levels:
- **Main Page (דף ראשי)**: Employee list with limited fields (name, title, department, contact).
- **Card (כרטיסייה)**: Full employee record with all details.

**M-002**: Some roles have access to Main Page only, not individual cards.

**M-003**: Every user has access to their own card (SELF scope) regardless of other HR permissions.

### 6.3 Module Documents

**M-004**: Each module may contain attached documents. Document permissions follow the parent entity's permissions.

**M-005**: There is no separate "Documents" module. Documents are accessed through their parent module.

### 6.4 Knowledge Repository Module

**M-006**: The Knowledge Repository (`knowledge_repository` / מאגר מידע) contains organization-wide institutional knowledge.

**Conceptual Content**:
- Tenders (participated and not participated)
- Standards and specifications
- General specifications (non-project-specific)
- Internal knowledge assets and lessons learned

**M-007**: The Knowledge Repository is a single unified module. It MUST NOT be split into sub-modules.

### 6.5 Financial Module

**M-008**: The Financial module (`financial` / פיננסי) is a **placeholder** for future implementation.

**M-009**: When implemented, full permission matrix coverage will be added to this document.

---

## 7. Permission Matrix

### 7.1 Permission Structure

Each permission is defined by: Module + Operation + Scope

Standard operations:
- `READ` — View records
- `CREATE` — Create new records
- `UPDATE` — Modify existing records
- `DELETE` — Remove records

### 7.2 Matrix Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Full access (ALL scope) |
| ⚠️ | Conditional access (see notes) |
| ❌ | No access |

---

### 7.3 Owner (בעלים)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ | ✅ | ✅ | ✅ |
| כח אדם | ✅ | ✅ | ✅ | ✅ |
| יומן אירועים | ✅ | ✅ | ✅ | ✅ |
| ציוד | ✅ | ✅ | ✅ | ✅ |
| רכבים | ✅ | ✅ | ✅ | ✅ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ✅ | ✅ | ✅ |
| פיננסי | ✅ | ✅ | ✅ | ✅ |
| Admin Console | ✅ | ✅ | ✅ | ✅ |
| WDI Agent | ✅ All data | — | — | — |

---

### 7.4 Executive / CEO (מנכ״ל)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ | ✅ | ✅ | ✅ |
| כח אדם | ✅ | ✅ | ✅ | ✅ |
| יומן אירועים | ✅ | ✅ | ✅ | ✅ |
| ציוד | ✅ | ✅ | ✅ | ✅ |
| רכבים | ✅ | ✅ | ✅ | ✅ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ✅ | ✅ | ✅ |
| פיננסי | ✅ | ✅ | ✅ | ✅ |
| Admin Console | ✅ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.5 Trust Officer (מנהל/ת משרד)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ | ❌ | ❌ | ❌ |
| כח אדם | ✅ | ✅ | ✅ | ✅ |
| יומן אירועים | ✅ | ✅ | ✅ | ✅ |
| ציוד | ✅ | ✅ | ✅ | ✅ |
| רכבים | ✅ | ✅ | ✅ | ✅ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ✅ | ✅ | ✅ |
| פיננסי | ✅ | ✅ | ✅ | ✅ |
| Admin Console | ✅ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.6 PMO

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ All | ❌ | ❌ | ❌ |
| כח אדם | ⚠️ Main page + own card | ⚠️ Own card | ❌ | ❌ |
| יומן אירועים | ✅ All | ❌ | ❌ | ❌ |
| ציוד | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| רכבים | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.7 Finance Officer (מנהל כספים)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ | ❌ | ❌ | ❌ |
| כח אדם | ✅ | ❌ | ❌ | ❌ |
| יומן אירועים | ✅ | ❌ | ❌ | ❌ |
| ציוד | ✅ | ❌ | ❌ | ❌ |
| רכבים | ✅ | ❌ | ❌ | ❌ |
| דירוג ספקים | ✅ | ❌ | ❌ | ❌ |
| אנשי קשר | ✅ | ❌ | ❌ | ❌ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ✅ | ✅ | ✅ | ✅ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.8 Domain Head (ראש תחום)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ All | ⚠️ Domain only | ⚠️ Domain only | ⚠️ Domain only |
| כח אדם | ⚠️ Main page only | ❌ | ❌ | ❌ |
| יומן אירועים | ✅ All | ⚠️ Domain only | ⚠️ Domain only | ⚠️ Domain only |
| ציוד | ⚠️ Main page | ⚠️ Own only | ❌ | ❌ |
| רכבים | ⚠️ Main page | ⚠️ Own only | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ✅ | ✅ | ✅ |
| פיננסי | ⚠️ Domain projects | ⚠️ Domain projects | ⚠️ Domain projects | ⚠️ Domain projects |
| Admin Console | ❌ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.9 Project Manager (מנהל פרויקט)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ All | ⚠️ Assigned only | ⚠️ Assigned only | ❌ |
| כח אדם | ⚠️ Main page + own card | ⚠️ Own card | ❌ | ❌ |
| יומן אירועים | ✅ All | ⚠️ Assigned projects | ⚠️ Assigned projects | ⚠️ Own events only |
| ציוד | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| רכבים | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.10 Project Coordinator (מתאם פרויקט)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ All | ⚠️ Assigned only | ❌ | ❌ |
| כח אדם | ⚠️ Main page + own card | ⚠️ Own card | ❌ | ❌ |
| יומן אירועים | ⚠️ Assigned projects | ⚠️ Own events | ⚠️ Assigned projects | ⚠️ Own events only |
| ציוד | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| רכבים | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.11 Administration (אדמיניסטרציה)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| פרויקטים | ✅ | ⚠️ Contacts only | ⚠️ Contacts only | ⚠️ Contacts only |
| כח אדם | ⚠️ Contacts section only | ❌ | ❌ | ❌ |
| יומן אירועים | ❌ | ❌ | ❌ | ❌ |
| ציוד | ✅ | ✅ | ✅ | ✅ |
| רכבים | ✅ | ✅ | ✅ | ✅ |
| דירוג ספקים | ✅ | ✅ | ✅ | ❌ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

---

### 7.12 All Employees — Baseline (כל העובדים)

| Module | Read | Update | Create | Delete |
|--------|------|--------|--------|--------|
| כח אדם | ⚠️ Own card only | ⚠️ Own card only | ❌ | ❌ |
| ציוד | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| רכבים | ⚠️ Own only | ⚠️ Own only | ❌ | ❌ |
| All other modules | ❌ | ❌ | ❌ | ❌ |
| WDI Agent | ✅ Per read permissions | — | — | — |

**Note**: This is a temporary baseline role. New employees should be assigned an appropriate role within hours or days.

---

## 8. WDI Agent Access Rules

### 8.1 Agent Authorization Principle

The WDI Agent:
- Operates within the requesting user's read permissions
- Is permanently **read-only**
- Cannot access data the user cannot read

### 8.2 Agent Access Rule

**A-001**: The Agent can access exactly the data the user has READ permission for. No more, no less.

**A-002**: The Agent is read-only. It CANNOT perform CREATE, UPDATE, or DELETE operations.

**A-003**: When a user asks the Agent about data they cannot access, the Agent responds:
> "אין לך הרשאה מתאימה."
The Agent does not lie — it honestly reports that the user lacks permission.

---

## 9. Matrix Governance

### 9.1 Data-Driven RBAC

The authorization matrix is **data-driven**, not code-driven:
- Role definitions are stored in the database
- Permission grants are stored in the database
- User-role assignments are stored in the database
- Changes take effect immediately upon database commit

### 9.2 Authorized Editors

Only the following roles MAY modify RBAC configuration:
- **Owner**: Full RBAC administrative authority
- **Trust Officer**: Role assignment authority (except Owner role)

**G-001**: Trust Officer MUST NOT assign the Owner role to any user.

**G-002**: Trust Officer MUST NOT modify their own role.

**G-003**: No other role may modify user roles.

### 9.3 Change Effectiveness

**G-004**: Role changes take effect **immediately** upon database commit.

**G-005**: Active sessions MUST re-evaluate permissions on next request.

### 9.4 Governance Audit Requirements

Per DOC-008, the following operations generate audit records:

| Operation | Required Fields |
|-----------|-----------------|
| Role assignment | Actor, target user, previous role, new role, timestamp |
| Authorization failure | User, requested operation, target, timestamp |

---

## 10. User Interface Language Rule

### 10.1 Hebrew Requirement

**L-001**: All user-facing interface elements MUST be in **Hebrew (עברית)**.

**L-002**: There is no language switcher. The application operates exclusively in Hebrew.

### 10.2 RTL Layout

**L-003**: All UI layouts MUST be **right-to-left (RTL)**.

### 10.3 Role Names

Role display in UI uses Hebrew form per §4.1. Exception: PMO displays as "PMO" (English).

---

## 11. Compliance Checklist

### 11.1 Foundational Checks

- [ ] **C-001**: Default authorization state is deny
- [ ] **C-002**: All authorization decisions are server-side
- [ ] **C-003**: Authorization is enforced identically across all access paths

### 11.2 Role & Permission Checks

- [ ] **C-004**: Only the ten official roles exist in the system
- [ ] **C-005**: Users hold exactly one role at a time
- [ ] **C-006**: Role-permission mappings match §7 specifications
- [ ] **C-007**: Role assignment requires Owner or Trust Officer

### 11.3 Agent Checks

- [ ] **C-008**: Agent accesses only data within user's read permissions
- [ ] **C-009**: Agent is read-only (no create, update, delete)
- [ ] **C-010**: Agent does not reveal existence of unauthorized data

### 11.4 Governance Checks

- [ ] **C-011**: RBAC configuration is data-driven
- [ ] **C-012**: Only Owner and Trust Officer can assign roles
- [ ] **C-013**: Role changes take effect immediately
- [ ] **C-014**: All role changes are logged

### 11.5 UI Language Checks

- [ ] **C-015**: All user-facing UI text is in Hebrew
- [ ] **C-016**: Layout is right-to-left (RTL)

---

## 12. Scope Boundaries

### 12.1 In Scope

- Official role definitions for v2
- Module permission matrix
- Agent access rules
- RBAC governance rules
- UI language requirements
- Compliance checklist

### 12.2 Explicitly Out of Scope

- Authentication mechanisms (see DOC-005)
- RBAC implementation code (engineering concern)
- Database schema for RBAC tables (see DOC-010)
- Financial module implementation details (deferred)

### 12.3 Intentionally Excluded

The following RBAC patterns are explicitly rejected:

| Pattern | Reason for Rejection |
|---------|---------------------|
| Multiple roles per user | Complexity; single role is sufficient |
| Visibility Grants | Read scope built into role definition |
| Separate org_directory module | Merged into hr with main page vs card distinction |
| Separate documents module | Documents belong to parent entities |
| Agent write access | Permanent read-only per DOC-001 §3.3 |

---

## 13. Relationship to Canonical Baseline

### 13.1 Foundation Document

This document extends **DOC-006 (Authorization Model & RBAC Specification)**.

### 13.2 Conformance Requirements

This document conforms to:
- **DOC-001**: System Identity (Agent read-only constraint)
- **DOC-005**: Security, Privacy & Data Handling
- **DOC-006**: Authorization Model & RBAC Specification
- **DOC-008**: Observability & Audit Trail Policy

---

## 14. Amendment Process

### 14.1 Amendment Authority

Amendments to this document require:
- Documented justification
- CTO or Product Owner approval
- Version increment

### 14.2 Role/Permission Changes

Adding, modifying, or removing roles or permissions requires:
- This document to be amended first
- Implementation to follow documented specification
- Verification against Compliance Checklist (§11)

---

## 15. Closing Statement

- **No Agent response without read permission**
- **No shortcuts**
- **No implicit permissions**
- Any deviation from this matrix = bug

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v1.0 | 2026-01-25 11:32:01 | Claude (acting CTO) | Initial pre-canonical draft |
| v1.1 | 2026-01-25 11:37:13 | Claude (acting CTO) | Added Knowledge Repository placeholder, HR scope clarifications |
| v2.0 | 2026-01-26 01:03:00 | Claude (acting CTO) | **Major revision**: Simplified to single-role model, added PMO role, renamed Operations Staff → Administration and Senior PM → Project Manager, merged org_directory into hr with main page/card distinction, removed Visibility Grants (built into roles), added contacts and financial modules, removed separate documents module, updated all permission matrices per business requirements |

---

End of Document
