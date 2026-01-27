---
Canonical Document ID: DOC-014
Document Title: RBAC Authorization Matrix v2
Document Type: Canonical
Status: Canonical
Baseline Reference: Extends Canonical Baseline v1.2
Source Document: DOC-013 (RBAC Authorization Matrix & Operational Policy v2.0)
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Signatory: Chief Technology Officer (CTO)
Timezone: America/Chicago (CST)
Created At: 2026-01-25 12:26:18 CST
Last Updated: 2026-01-26 01:05:00 CST
Current Version: v2.0
---

# DOC-014 — RBAC Authorization Matrix v2

---

## 1. Purpose

### 1.1 Document Intent

This document is the **exhaustive, auditable rendering** of the RBAC Authorization Matrix for the WDI ERP system as defined in DOC-013 v2.0.

This document does NOT define policy. It renders the matrix in detailed format for operational reference, compliance verification, and implementation guidance.

### 1.2 Authority Relationship

This document is a **derivative artifact** of DOC-013 v2.0. All permissions, roles, scopes, and modules enumerated herein are derived exclusively from DOC-013.

If any discrepancy exists between this document and DOC-013, **DOC-013 prevails unconditionally**.

---

## 2. Roles Summary

| # | Role ID | Role Name (EN) | Role Name (HE) |
|---|---------|----------------|----------------|
| 1 | `owner` | Owner | בעלים |
| 2 | `executive` | Executive / CEO | מנכ״ל |
| 3 | `trust_officer` | Trust Officer | מנהל/ת משרד |
| 4 | `pmo` | PMO | PMO |
| 5 | `finance_officer` | Finance Officer | מנהל כספים |
| 6 | `domain_head` | Domain Head | ראש תחום |
| 7 | `project_manager` | Project Manager | מנהל פרויקט |
| 8 | `project_coordinator` | Project Coordinator | מתאם פרויקט |
| 9 | `administration` | Administration | אדמיניסטרציה |
| 10 | `all_employees` | All Employees | כל העובדים |

---

## 3. Modules Summary

| # | Module ID | Module Name (HE) | Status |
|---|-----------|------------------|--------|
| 1 | `events` | יומן אירועים | Active |
| 2 | `projects` | פרויקטים | Active |
| 3 | `hr` | כח אדם | Active |
| 4 | `contacts` | אנשי קשר | Active |
| 5 | `vendors` | דירוג ספקים | Active |
| 6 | `equipment` | ציוד | Active |
| 7 | `vehicles` | רכבים | Active |
| 8 | `knowledge_repository` | מאגר מידע | Active |
| 9 | `financial` | פיננסי | Placeholder |
| 10 | `agent` | WDI Agent | Active |
| 11 | `admin` | Admin Console | Active |

---

## 4. Matrix Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Full access (ALL scope) |
| ⚠️ D | Domain scope only |
| ⚠️ A | Assigned projects/entities only |
| ⚠️ O | Own (created by / assigned to user) only |
| ⚠️ S | Self (own card/record) only |
| ⚠️ MP | Main Page only (list view, not cards) |
| ⚠️ C | Contacts section only |
| ❌ | No access |
| — | Not applicable |

---

## 5. Full Permission Matrix by Role

---

### 5.1 Owner (בעלים)

**Authority Level**: Unrestricted

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
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

**WDI Agent**: ✅ Full access to all data

---

### 5.2 Executive / CEO (מנכ״ל)

**Authority Level**: Full operational, no Admin modification

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
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

**WDI Agent**: ✅ Access to all data with read permission

---

### 5.3 Trust Officer (מנהל/ת משרד)

**Authority Level**: Administrative / HR / Operations

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
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

**WDI Agent**: ✅ Access to all data with read permission

---

### 5.4 PMO

**Authority Level**: Cross-project visibility, limited operations

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
| פרויקטים | ✅ | ❌ | ❌ | ❌ |
| כח אדם | ⚠️ MP + S | ⚠️ S | ❌ | ❌ |
| יומן אירועים | ✅ | ❌ | ❌ | ❌ |
| ציוד | ⚠️ O | ⚠️ O | ❌ | ❌ |
| רכבים | ⚠️ O | ⚠️ O | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- כח אדם: Main page (list view) + own card only
- ציוד/רכבים: Only equipment/vehicle assigned to user

**WDI Agent**: ✅ Access to data with read permission

---

### 5.5 Finance Officer (מנהל כספים)

**Authority Level**: Read-heavy + Financial control

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
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

**WDI Agent**: ✅ Access to data with read permission

---

### 5.6 Domain Head (ראש תחום)

**Authority Level**: Domain-scoped operations

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
| פרויקטים | ✅ | ⚠️ D | ⚠️ D | ⚠️ D |
| כח אדם | ⚠️ MP | ❌ | ❌ | ❌ |
| יומן אירועים | ✅ | ⚠️ D | ⚠️ D | ⚠️ D |
| ציוד | ⚠️ MP | ⚠️ O | ❌ | ❌ |
| רכבים | ⚠️ MP | ⚠️ O | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ✅ | ✅ | ✅ |
| פיננסי | ⚠️ D | ⚠️ D | ⚠️ D | ⚠️ D |
| Admin Console | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- פרויקטים: Read all, write only domain projects
- כח אדם: Main page only (list view)
- פיננסי: Domain projects only

**WDI Agent**: ✅ Access to data with read permission

---

### 5.7 Project Manager (מנהל פרויקט)

**Authority Level**: Assigned projects

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
| פרויקטים | ✅ | ⚠️ A | ⚠️ A | ❌ |
| כח אדם | ⚠️ MP + S | ⚠️ S | ❌ | ❌ |
| יומן אירועים | ✅ | ⚠️ A | ⚠️ A | ⚠️ O |
| ציוד | ⚠️ O | ⚠️ O | ❌ | ❌ |
| רכבים | ⚠️ O | ⚠️ O | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- פרויקטים: Read all, write assigned projects only, no delete
- יומן אירועים: Delete only own events
- כח אדם: Main page + own card

**WDI Agent**: ✅ Access to data with read permission

---

### 5.8 Project Coordinator (מתאם פרויקט)

**Authority Level**: Assigned projects, limited scope

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
| פרויקטים | ✅ | ⚠️ A | ❌ | ❌ |
| כח אדם | ⚠️ MP + S | ⚠️ S | ❌ | ❌ |
| יומן אירועים | ⚠️ A | ⚠️ O | ⚠️ A | ⚠️ O |
| ציוד | ⚠️ O | ⚠️ O | ❌ | ❌ |
| רכבים | ⚠️ O | ⚠️ O | ❌ | ❌ |
| דירוג ספקים | ✅ | ✅ | ✅ | ✅ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- פרויקטים: Read all, update assigned, no create/delete
- יומן אירועים: Only assigned projects, edit/delete own events only

**WDI Agent**: ✅ Access to data with read permission

---

### 5.9 Administration (אדמיניסטרציה)

**Authority Level**: Equipment, vehicles, vendors, contacts

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
| פרויקטים | ✅ | ⚠️ C | ⚠️ C | ⚠️ C |
| כח אדם | ⚠️ C | ❌ | ❌ | ❌ |
| יומן אירועים | ❌ | ❌ | ❌ | ❌ |
| ציוד | ✅ | ✅ | ✅ | ✅ |
| רכבים | ✅ | ✅ | ✅ | ✅ |
| דירוג ספקים | ✅ | ✅ | ✅ | ❌ |
| אנשי קשר | ✅ | ✅ | ✅ | ✅ |
| מאגר מידע | ✅ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- פרויקטים: Contacts section only (add/edit/remove project contacts)
- כח אדם: Contacts section only
- דירוג ספקים: No delete

**WDI Agent**: ✅ Access to data with read permission

---

### 5.10 All Employees — Baseline (כל העובדים)

**Authority Level**: Minimal (temporary role)

| Module | צפייה (Read) | עדכון (Update) | יצירה (Create) | מחיקה (Delete) |
|--------|-------------|----------------|----------------|----------------|
| פרויקטים | ❌ | ❌ | ❌ | ❌ |
| כח אדם | ⚠️ S | ⚠️ S | ❌ | ❌ |
| יומן אירועים | ❌ | ❌ | ❌ | ❌ |
| ציוד | ⚠️ O | ⚠️ O | ❌ | ❌ |
| רכבים | ⚠️ O | ⚠️ O | ❌ | ❌ |
| דירוג ספקים | ❌ | ❌ | ❌ | ❌ |
| אנשי קשר | ❌ | ❌ | ❌ | ❌ |
| מאגר מידע | ❌ | ❌ | ❌ | ❌ |
| פיננסי | ❌ | ❌ | ❌ | ❌ |
| Admin Console | ❌ | ❌ | ❌ | ❌ |

**Notes**:
- כח אדם: Own card only (view + update)
- ציוד/רכבים: Own assigned equipment/vehicle only
- **This is a TEMPORARY role** — should be replaced within hours/days

**WDI Agent**: ✅ Access to data with read permission (very limited)

---

## 6. Module-Centric View

### 6.1 פרויקטים (Projects)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ❌ | ❌ | ❌ |
| PMO | ✅ | ❌ | ❌ | ❌ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ✅ | ⚠️ D | ⚠️ D | ⚠️ D |
| Project Manager | ✅ | ⚠️ A | ⚠️ A | ❌ |
| Project Coordinator | ✅ | ⚠️ A | ❌ | ❌ |
| Administration | ✅ | ⚠️ C | ⚠️ C | ⚠️ C |
| All Employees | ❌ | ❌ | ❌ | ❌ |

---

### 6.2 כח אדם (HR)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ⚠️ MP + S | ⚠️ S | ❌ | ❌ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ⚠️ MP | ❌ | ❌ | ❌ |
| Project Manager | ⚠️ MP + S | ⚠️ S | ❌ | ❌ |
| Project Coordinator | ⚠️ MP + S | ⚠️ S | ❌ | ❌ |
| Administration | ⚠️ C | ❌ | ❌ | ❌ |
| All Employees | ⚠️ S | ⚠️ S | ❌ | ❌ |

**Legend**: MP = Main Page, S = Self (own card), C = Contacts section

---

### 6.3 יומן אירועים (Events)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ✅ | ❌ | ❌ | ❌ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ✅ | ⚠️ D | ⚠️ D | ⚠️ D |
| Project Manager | ✅ | ⚠️ A | ⚠️ A | ⚠️ O |
| Project Coordinator | ⚠️ A | ⚠️ O | ⚠️ A | ⚠️ O |
| Administration | ❌ | ❌ | ❌ | ❌ |
| All Employees | ❌ | ❌ | ❌ | ❌ |

**Legend**: D = Domain, A = Assigned, O = Own

---

### 6.4 ציוד (Equipment)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ⚠️ O | ⚠️ O | ❌ | ❌ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ⚠️ MP | ⚠️ O | ❌ | ❌ |
| Project Manager | ⚠️ O | ⚠️ O | ❌ | ❌ |
| Project Coordinator | ⚠️ O | ⚠️ O | ❌ | ❌ |
| Administration | ✅ | ✅ | ✅ | ✅ |
| All Employees | ⚠️ O | ⚠️ O | ❌ | ❌ |

---

### 6.5 רכבים (Vehicles)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ⚠️ O | ⚠️ O | ❌ | ❌ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ⚠️ MP | ⚠️ O | ❌ | ❌ |
| Project Manager | ⚠️ O | ⚠️ O | ❌ | ❌ |
| Project Coordinator | ⚠️ O | ⚠️ O | ❌ | ❌ |
| Administration | ✅ | ✅ | ✅ | ✅ |
| All Employees | ⚠️ O | ⚠️ O | ❌ | ❌ |

---

### 6.6 דירוג ספקים (Vendors)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ✅ | ✅ | ✅ | ✅ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ✅ | ✅ | ✅ |
| Project Coordinator | ✅ | ✅ | ✅ | ✅ |
| Administration | ✅ | ✅ | ✅ | ❌ |
| All Employees | ❌ | ❌ | ❌ | ❌ |

---

### 6.7 אנשי קשר (Contacts)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ✅ | ✅ | ✅ | ✅ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ✅ | ✅ | ✅ |
| Project Coordinator | ✅ | ✅ | ✅ | ✅ |
| Administration | ✅ | ✅ | ✅ | ✅ |
| All Employees | ❌ | ❌ | ❌ | ❌ |

---

### 6.8 מאגר מידע (Knowledge Repository)

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ✅ | ❌ | ❌ | ❌ |
| Finance Officer | ✅ | ❌ | ❌ | ❌ |
| Domain Head | ✅ | ✅ | ✅ | ✅ |
| Project Manager | ✅ | ❌ | ❌ | ❌ |
| Project Coordinator | ✅ | ❌ | ❌ | ❌ |
| Administration | ✅ | ❌ | ❌ | ❌ |
| All Employees | ❌ | ❌ | ❌ | ❌ |

---

### 6.9 פיננסי (Financial)

**Status**: Placeholder — Module not yet implemented

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ✅ | ✅ | ✅ |
| Trust Officer | ✅ | ✅ | ✅ | ✅ |
| PMO | ❌ | ❌ | ❌ | ❌ |
| Finance Officer | ✅ | ✅ | ✅ | ✅ |
| Domain Head | ⚠️ D | ⚠️ D | ⚠️ D | ⚠️ D |
| Project Manager | ❌ | ❌ | ❌ | ❌ |
| Project Coordinator | ❌ | ❌ | ❌ | ❌ |
| Administration | ❌ | ❌ | ❌ | ❌ |
| All Employees | ❌ | ❌ | ❌ | ❌ |

---

### 6.10 Admin Console

| Role | Read | Update | Create | Delete |
|------|------|--------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Executive | ✅ | ❌ | ❌ | ❌ |
| Trust Officer | ✅ | ❌ | ❌ | ❌ |
| PMO | ❌ | ❌ | ❌ | ❌ |
| Finance Officer | ❌ | ❌ | ❌ | ❌ |
| Domain Head | ❌ | ❌ | ❌ | ❌ |
| Project Manager | ❌ | ❌ | ❌ | ❌ |
| Project Coordinator | ❌ | ❌ | ❌ | ❌ |
| Administration | ❌ | ❌ | ❌ | ❌ |
| All Employees | ❌ | ❌ | ❌ | ❌ |

---

## 7. WDI Agent Access Summary

| Role | Agent Access |
|------|--------------|
| Owner | All data in system |
| Executive | All data with read permission |
| Trust Officer | All data with read permission |
| PMO | Projects, events, vendors, contacts, knowledge repository (read) |
| Finance Officer | All modules read (financial full) |
| Domain Head | Projects, events, vendors, contacts, knowledge repository, domain financial |
| Project Manager | Projects, events (all), vendors, contacts, knowledge repository (read) |
| Project Coordinator | Assigned projects/events, vendors, contacts, knowledge repository (read) |
| Administration | Projects, equipment, vehicles, vendors, contacts, knowledge repository (read) |
| All Employees | Own HR card, own equipment, own vehicle only |

**Agent is READ-ONLY. Agent cannot perform CREATE, UPDATE, or DELETE.**

---

## 8. Closing Statement

This matrix is the **single source of truth** for WDI-ERP authorization.

- **No Agent response without read permission**
- **No shortcuts**
- **No implicit permissions**
- Any deviation from this matrix = **bug**

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v1.0 | 2026-01-25 12:26:18 | Claude (acting CTO) | Initial matrix rendering from DOC-013 v1.1 |
| v2.0 | 2026-01-26 01:05:00 | Claude (acting CTO) | Complete rewrite aligned with DOC-013 v2.0: 10 roles, 11 modules, simplified scopes, role-centric and module-centric views |

---

End of Document
