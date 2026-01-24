---
Canonical Document ID: DOC-001
Document Title: System Identity & Non-Negotiable Principles
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 10:45:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 10:45:00 CST
Last Updated: 2026-01-23 10:45:00 CST
Current Version: v1.0
---

# DOC-001 — System Identity & Non-Negotiable Principles

---

## 1. Purpose

This document defines what the WDI ERP system is, what it is not, and what principles are inviolable regardless of circumstance, pressure, or convenience.

Every architectural decision, feature request, and implementation choice must be evaluated against this document. If a proposal conflicts with any principle stated here, the proposal is rejected. There are no exceptions. There is no appeals process. There is no "just this once."

This is not a vision statement. This is not a guideline. This is a constitutional constraint that binds all future decisions.

---

## 2. System Identity

### 2.1 What the System Is

WDI ERP is an internal operational management system for construction and infrastructure project management.

The system exists to:
- Manage construction and infrastructure projects through their lifecycle
- Track operational events, decisions, and incidents
- Maintain records of personnel, vendors, equipment, and vehicles
- Provide operational intelligence through a read-only AI agent
- Preserve institutional knowledge through structured documentation attached to operational entities

The system serves internal users only. All users are authenticated employees of the operating organization.

**This identity is a binding constraint.** Any proposal that would alter, dilute, or extend this identity beyond its stated boundaries is invalid. The system's purpose is fixed. Growth occurs within these boundaries, not beyond them.

### 2.2 What the System Is Not

The system must never become:
- An accounting system
- An invoicing or billing system
- A payroll processor
- A customer-facing portal
- A vendor self-service platform
- A public website or marketing tool
- A standalone document management system (documents exist only in relation to operational entities)
- A general-purpose file storage or sharing platform

These exclusions are permanent and absolute. Any feature request that moves the system toward these functions is invalid by definition. The phrase "but it would be easy to add" is not a justification; it is a warning sign.

### 2.3 Operational Context

The system operates in the Israeli construction and infrastructure industry. This context determines:
- Hebrew RTL interface for all operational users
- English for all technical documentation, code, and canonical governance
- Compliance with Israeli data protection requirements
- Integration patterns appropriate for the local business environment

---

## 3. Non-Negotiable Principles

The following principles are absolute constraints. They are not guidelines, recommendations, or best practices. They are hard boundaries that cannot be waived, delayed, negotiated, or compromised under any circumstance.

Violation of any principle in this section constitutes a system defect regardless of intent, timeline pressure, or business justification.

### 3.1 Data Integrity Above All

Every record in the system must be:
- Attributable to an authenticated user
- Timestamped at creation and modification
- Preservable through soft deletion
- Auditable through complete history

Anonymous data is forbidden. Orphaned data is forbidden. Silent mutations are forbidden.

### 3.2 Authorization Is Universal

Every data access path—UI, API, agent, internal service—is subject to the same authorization model. There are no trusted internal paths. There are no admin backdoors that bypass logging.

If a user cannot access data through the UI, they cannot access it through any other means.

### 3.3 The AI Agent Is Read-Only

The embedded AI agent retrieves and presents information. It never creates, modifies, or deletes data. It never triggers workflows. It never acts on behalf of users.

**Principled Justification:** The agent's read-only constraint exists because write operations require accountability, and accountability requires human decision-making. Every mutation in the system must be attributable to a human actor who made a deliberate choice. Allowing an agent to write data would create a category of system changes that cannot be meaningfully attributed to human judgment. This undermines auditability, diffuses responsibility, and introduces unpredictable system behavior. The constraint is not a temporary limitation; it is a deliberate architectural decision rooted in the requirement that humans remain accountable for all data in the system.

This constraint is permanent and non-negotiable. Any proposal to grant the agent write capabilities is rejected without discussion.

### 3.4 Audit Trails Are Mandatory

All state-changing operations are logged with:
- Actor identity
- Timestamp
- Operation type
- Before and after state

Audit logs are immutable. They are never deleted, modified, or truncated.

### 3.5 Security Is a System Property

Security is not a feature to be added. It is a property of the system that must be preserved at every layer. Least privilege is the default. Explicit access is required. Defense in depth is mandatory.

---

## 4. Scope Boundaries

### 4.1 In Scope

- Project management (hierarchical: mega-projects, quarters, buildings)
- Event logging (operational journal)
- HR and personnel management
- Vendor and contractor management
- Vehicle fleet management
- Equipment and asset management
- Document management (exclusively as attachments to operational entities; never standalone)
- Read-only AI agent for data queries

### 4.2 Explicitly Out of Scope

- Financial accounting
- Invoice generation and management
- Payroll processing
- Customer relationship management
- External user access
- Public data exposure
- Real-time collaboration (document co-editing)
- Workflow automation beyond simple state transitions
- Standalone document storage, browsing, or sharing unattached to operational entities

### 4.3 Intentionally Excluded

The following capabilities are intentionally excluded and must not be implemented:
- Multi-tenant architecture (the system serves one organization)
- Multi-language UI (Hebrew RTL only)
- Offline-first architecture (network connectivity is assumed)
- Third-party app marketplace or plugin system
- User-defined custom fields without schema migration
- Document repositories, folders, or browsing interfaces independent of operational context

---

## 5. Implications for Implementation

### 5.1 Backend

- All endpoints enforce authentication before any processing
- All endpoints enforce authorization after authentication
- All mutations trigger audit logging at the persistence layer
- No endpoint bypasses the authorization model for "performance" or "convenience"
- The AI agent has dedicated read-only endpoints; it shares no mutation paths with other consumers

### 5.2 Frontend

- All layouts are RTL-first; LTR assumptions are defects
- All UI text is Hebrew; English labels in Hebrew UI are defects
- Authorization state is fetched from the server; client-side permission caching is for UX only
- No sensitive operations rely solely on UI enforcement

### 5.3 Data

- Every table has: id, createdAt, createdBy, updatedAt, updatedBy, deletedAt
- Foreign keys are explicit and enforced at the database level
- Cascading deletes are forbidden
- Soft deletion is mandatory for all business entities
- Documents are always linked to a parent operational entity; orphan documents are forbidden

### 5.4 Infrastructure

- Production environment is isolated from staging and development
- Secrets are never stored in code or version control
- All deployments are reproducible from source
- Rollback capability is mandatory for every deployment

### 5.5 AI / Agent

- Agent queries are parameterized by user authorization context
- Agent responses contain only data the requesting user may access
- Agent implementation contains no code paths for data mutation
- Agent errors do not expose internal system details

---

## 6. Explicit Anti-Patterns

The following patterns are forbidden. Any implementation that matches these patterns is defective and must be corrected before deployment. Discovery of these patterns in production constitutes an incident requiring immediate remediation.

These prohibitions carry the same authority as the non-negotiable principles in Section 3. They are not suggestions.

| Anti-Pattern | Violation |
|--------------|-----------|
| Adding "just a simple" accounting feature | Violates system identity |
| Creating a vendor login portal | Violates user boundary |
| Implementing agent write actions "for efficiency" | Violates agent constraint and accountability principle |
| Skipping audit logging "for performance" | Violates audit requirement |
| Hardcoding admin bypass for testing | Violates authorization model |
| Storing secrets in environment files committed to git | Violates security doctrine |
| Adding English-only error messages to Hebrew UI | Violates localization requirement |
| Creating tables without audit fields | Violates data integrity |
| Implementing cascading deletes | Violates data preservation |
| Building features without clear operational justification | Violates system purpose |
| Creating a standalone document browser or file manager | Violates document attachment constraint |
| Allowing document uploads without linking to an operational entity | Violates document context requirement |

---

## 7. Governance

This document may only be amended through formal change control. Silent changes are void. Unilateral changes are void.

Any engineer, architect, or product manager may cite this document to reject a proposal. The burden of proof lies with the proposer to demonstrate compliance, not with the reviewer to prove violation.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 10:45:00 CST | Claude (acting CTO) | Initial pre-canonical draft with governance-compliant metadata and timestamping |
| v1.0 | 2026-01-23 10:45:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
