---
Product Document ID: P002
Document Title: User Types, Roles & Personas
Document Type: Product Canon
Status: Canonical
Author: Product Leadership
Owner: Product Leadership
Signatory: Chief Product Officer (CPO)
Canonical Conformance Review: Chief Technology Officer (CTO)
Authority Level: Product Canon
Authority Relationship: Subordinate to Technical & Governance Canon
Timezone: America/Chicago (CST)
Created At: 2026-01-23 18:05:00 CST
Last Updated: 2026-01-23 16:21:00 CST
Current Version: v1.2
---

# P002 — User Types, Roles & Personas

---

## 1. Purpose

This document defines the users of the WDI ERP system—who they are, what roles they occupy, and how they interact with the product.

Understanding users is not optional. Product decisions that ignore user reality fail.

---

## 2. User Population

### 2.1 User Boundary

All users are authenticated employees of the WDI operating organization. There are no external users. There are no anonymous users. There are no guest users.

User authentication is restricted to:
- @wdi.one email domain
- @wdiglobal.com email domain

### 2.2 User Characteristics

| Characteristic | Description |
|----------------|-------------|
| Language | Primary operational language is Hebrew (RTL). Additional languages are currently unsupported. |
| Location | Primarily Israel; some remote/field users |
| Technical Proficiency | Varies from basic to advanced |
| Device | Desktop (primary), mobile (field use) |
| Connectivity | Generally reliable; field conditions may vary |

### 2.3 User Count

The system serves a bounded user population typical of a single-organization deployment. The user base is not expected to scale beyond organizational headcount.

---

## 3. Organizational Roles

### 3.1 Role Definitions

The system recognizes seven organizational roles per DOC-006:

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| Founder | Organization owner with full system access | All permissions |
| CEO | Executive leader with operational oversight | All operational permissions |
| Office Manager | Administrative operations coordinator | HR, Vendors, Vehicles, Equipment admin |
| Department Manager | Department-level management | Projects, Events, Personnel within scope |
| Project Manager | Project-level operations lead | Projects admin, Events create/edit |
| Secretary | Administrative support staff | Events create, Documents upload, view access |
| Employee | General operational staff | View access, limited create permissions |

### 3.2 Role Assignment

- Users are assigned to exactly one organizational role
- Role determines base permission set
- Additional permissions may be granted within role boundaries
- Role changes require administrative action and are logged

### 3.3 Role vs Authorization

Organizational roles map to authorization roles per DOC-006. The mapping is:
- Roles define job function and responsibility
- Authorization roles define system permissions
- The authorization model is the source of truth for what users can do

---

## 4. User Personas

### 4.1 Persona Purpose

Personas represent archetypal users to guide product decisions. They are not exhaustive; they are illustrative.

Personas describe intent and typical interaction patterns only. Personas do NOT grant system capabilities and do NOT alter authorization boundaries. Authorization is governed exclusively by DOC-006.

### 4.2 Persona: Dani (Project Manager)

**Profile:**
- Role: Project Manager
- Experience: 8 years in construction
- Technical comfort: Moderate
- Primary tasks: Project oversight, event logging, team coordination

**Goals:**
- Track project progress without manual reporting
- Document issues and decisions in real-time
- Access project history quickly
- Understand vendor performance on their projects

**Pain Points:**
- Previous systems required duplicate data entry
- Information scattered across email, WhatsApp, and spreadsheets
- Difficulty reconstructing project history for disputes

**Product Interaction:**
- Daily use of Events module
- Weekly review of project dashboards
- Frequent queries to WDI Agent for quick lookups

### 4.3 Persona: Maya (Office Manager)

**Profile:**
- Role: Office Manager
- Experience: 5 years in administration
- Technical comfort: High
- Primary tasks: HR administration, vendor management, fleet coordination

**Goals:**
- Maintain accurate employee records
- Track vendor relationships and performance
- Coordinate vehicle assignments
- Ensure document compliance

**Pain Points:**
- Manual tracking of document expiration
- Difficulty seeing who is assigned to what
- Vendor information spread across multiple sources

**Product Interaction:**
- Daily use of HR and Vendors modules
- Regular use of Vehicles module
- Administrative configuration as needed

### 4.4 Persona: Yossi (Field Employee)

**Profile:**
- Role: Employee
- Experience: 3 years as site supervisor
- Technical comfort: Basic
- Primary tasks: Log site events, check assignments

**Goals:**
- Log events quickly from the field
- Check which equipment/vehicles are available
- Find contact information for vendors on-site

**Pain Points:**
- Limited time for data entry
- Unreliable connectivity at some sites
- Needs simple, fast interface

**Product Interaction:**
- Mobile-first through Events PWA
- Quick lookups via WDI Agent
- Minimal administrative interaction

### 4.5 Persona: Sarah (CEO)

**Profile:**
- Role: CEO
- Experience: 15 years in industry
- Technical comfort: Moderate
- Primary tasks: Strategic oversight, decision support

**Goals:**
- Visibility into operational status without meetings
- Quick answers to strategic questions
- Confidence in data accuracy
- Historical context for decisions

**Pain Points:**
- Waiting for reports that are already outdated
- Inconsistent information from different sources
- Difficulty getting quick answers to simple questions

**Product Interaction:**
- WDI Agent for queries
- Dashboard reviews
- Occasional deep-dives into specific projects

---

## 5. User Journey Contexts

### 5.1 Office Context

Users working from office environment:
- Reliable connectivity
- Desktop/laptop primary device
- Extended session duration
- Full interface access

### 5.2 Field Context

Users working from construction sites:
- Variable connectivity
- Mobile device primary
- Brief, task-focused sessions
- Simplified interface needs (PWA)

### 5.3 Remote Context

Users working remotely:
- Generally reliable connectivity
- Desktop or laptop
- Full interface access
- May span multiple sessions

---

## 6. User Onboarding

### 6.1 Onboarding Requirements

New users require:
- Valid organizational email (@wdi.one or @wdiglobal.com)
- Role assignment by administrator
- Initial orientation to relevant modules

### 6.2 Onboarding Flow

1. Administrator creates user record in HR module
2. User receives Google OAuth access
3. User authenticates and accesses system
4. System applies role-based permissions
5. User begins operational use

### 6.3 No Self-Registration

Users cannot self-register. All user creation is administrative. This ensures:
- Organizational control over access
- Proper role assignment
- Audit trail from first access

---

## 7. User Offboarding

### 7.1 Offboarding Process

When users leave the organization:
1. Administrator marks employee as inactive
2. Authentication is revoked (Google OAuth domain restriction handles this)
3. User's historical actions remain attributed to them
4. User's data (as creator/modifier) remains in system

### 7.2 Data Preservation

User departure does not erase their contributions:
- Created records retain their attribution
- Modified records retain their history
- Events logged by the user remain
- This preserves institutional memory per DOC-001 §3.1

---

## 8. User Support Expectations

### 8.1 Self-Service First

Users are expected to:
- Use the WDI Agent for information queries
- Navigate the interface for standard operations
- Consult help documentation for guidance

### 8.2 Escalation Path

When self-service is insufficient:
- Office Manager for administrative issues
- Department Manager for operational questions
- Technical support for system issues

### 8.3 No External Support

There is no external helpdesk. Support is internal to the organization.

---

## 9. Relationship to Canonical Baseline

### 9.1 Binding Documents

This product document is bound by:
- DOC-001: System Identity (user boundary constraints)
- DOC-005: Security, Privacy & Data Handling (user data handling)
- DOC-006: Authorization Model (role definitions, permission model)

### 9.2 Conformance Requirement

User role definitions must align with the authorization model. Personas inform product design but do not override authorization constraints.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 18:05:00 CST | Claude (acting CPO) | Initial draft of User Types, Roles & Personas |
| v1.0 | 2026-01-23 18:05:00 CST | Claude (acting CPO) | Promotion to Canonical Product Baseline |
| v1.1 | 2026-01-23 18:35:00 CST | Claude (acting CPO) | Clarified persona authorization boundaries (§4.1) per Canon Hardening Pass |
| v1.2 | 2026-01-23 16:21:00 CST | Product Leadership | Canon hardening pass (audit alignment, authority clarification, timestamp governance) |

---

End of Document
