---
Product Document ID: P001
Document Title: Product Identity, Scope & Canonical Authority
Document Type: Product Canon
Status: Canonical
Author: Product Leadership
Owner: Product Leadership
Signatory: Chief Product Officer (CPO)
Canonical Conformance Review: Chief Technology Officer (CTO)
Authority Level: Product Canon
Authority Relationship: Subordinate to Technical & Governance Canon
Timezone: America/Chicago (CST)
Created At: 2026-01-23 18:00:00 CST
Last Updated: 2026-01-23 16:21:00 CST
Current Version: v1.2
---

# P001 — Product Identity, Scope & Canonical Authority

---

## 1. Purpose

This document defines what the WDI ERP product is, what it is not, whom it serves, and how product decisions relate to the governing canonical baseline.

Product identity is not marketing. It is a constraint system that determines what gets built, what gets rejected, and how trade-offs are resolved.

---

## 2. Product Mission

### 2.1 Mission Statement

WDI ERP exists to provide WDI's operational staff with a unified system to manage construction and infrastructure projects, track operational events, maintain personnel and vendor records, and access institutional knowledge through an intelligent read-only agent.

The product succeeds when:
- Operational data is captured completely and accurately
- Users can retrieve information faster than through manual methods
- Institutional knowledge survives personnel changes
- Decision-makers have visibility into project status without manual reporting

### 2.2 Mission Boundaries

The mission explicitly excludes:
- Financial optimization or accounting
- Customer acquisition or retention
- External stakeholder self-service
- Workflow automation beyond state tracking
- Document management independent of operational context

---

## 3. Product Scope

### 3.1 In-Scope Capabilities

The product encompasses:

| Domain | Capability |
|--------|------------|
| Projects | Hierarchical management (mega-projects → quarters → buildings) |
| Events | Operational journal with categorized event types and file attachments |
| HR | Employee profiles, documents, assignments, and organizational structure |
| Vendors | Organization and individual contact management with project-specific ratings |
| Vehicles | Fleet management with assignment tracking and document storage |
| Equipment | Asset tracking with assignment history |
| Documents | File attachments bound to operational entities |
| AI Agent | Read-only intelligent query interface (WDI Agent) |

### 3.2 Out-of-Scope Capabilities

The following are permanently excluded from product scope:

| Exclusion | Rationale |
|-----------|-----------|
| Accounting and invoicing | Violates system identity (DOC-001 §2.2) |
| Payroll processing | Violates system identity (DOC-001 §2.2) |
| Customer portals | Violates internal-only constraint (DOC-001 §2.1) |
| Vendor self-service | Violates internal-only constraint (DOC-001 §2.1) |
| Standalone document browser | Violates document attachment constraint (DOC-001 §4.3) |
| Real-time collaboration | Violates scope boundaries (DOC-001 §4.2) |
| Multi-language UI | Hebrew RTL only per operational context (DOC-001 §2.3) |
| Multi-tenant architecture | Single organization per deployment (DOC-001 §4.3) |

### 3.3 Scope Change Process

Scope changes require:
1. Verification that the change does not violate canonical constraints
2. Product Owner approval
3. Documentation update to this document
4. If canonical conflict exists, canonical amendment must precede product change

---

## 4. Product vs Platform Boundaries

### 4.1 Product Layer

The product layer includes:
- User-facing interfaces (web application, mobile PWA)
- Business logic that implements operational workflows
- Data presentation and visualization
- AI Agent response formatting and user interaction
- Hebrew localization and RTL presentation

### 4.2 Platform Layer

The platform layer (governed by Engineering Canon) includes:
- Authentication and session management
- Authorization enforcement
- Database schema and migrations
- API infrastructure
- File storage infrastructure
- Deployment and observability

### 4.3 Boundary Rules

- Product decisions cannot alter platform security properties
- Product features cannot bypass authorization model
- Product UX cannot expose data users are not authorized to view
- Product changes that require platform changes must be coordinated through Engineering

---

## 5. Target Users

### 5.1 Primary Users

All users are authenticated employees of WDI operating organization with @wdi.one or @wdiglobal.com email domains.

| User Type | Description |
|-----------|-------------|
| Operational Staff | Day-to-day data entry and retrieval |
| Project Leadership | Project oversight and status monitoring |
| Administrative Staff | HR, vendor, and fleet management |
| Executive Leadership | Strategic visibility and decision support |

### 5.2 Explicit Non-Users

The product does not serve:
- External customers or clients
- Vendors or contractors (they are data subjects, not users)
- Public or unauthenticated visitors
- Third-party integrators without explicit arrangement

---

## 6. Authority Hierarchy

### 6.1 Canonical Supremacy

The Canonical Technical & Governance Baseline (DOC-000 through DOC-012) has absolute authority over product decisions.

If a product proposal conflicts with any canonical document:
- The canonical document prevails
- The product proposal is rejected or modified
- No product authority can override canonical constraints

### 6.2 Product Authority

Within canonical constraints, Product Leadership has authority over:
- Feature prioritization
- User experience design
- Module organization and navigation
- Hebrew UI text and terminology
- Non-functional product requirements (within SLO bounds)

### 6.3 Engineering Authority

Engineering has authority over:
- Technical implementation approach
- Architecture within canonical constraints
- Performance optimization methods
- Deployment timing and rollback decisions

### 6.4 Conflict Resolution

| Conflict Type | Resolution |
|---------------|------------|
| Product vs Canonical | Canonical prevails unconditionally |
| Product vs Engineering (technical) | Engineering prevails for implementation approach |
| Product vs Engineering (user experience) | Product prevails within technical constraints |
| Product vs Product | Product Owner decides |

---

## 7. Product Principles

### 7.1 Operational Truth

The product is the system of record for operational data. Data in the product represents organizational truth. Conflicting information in other systems should be reconciled to match the product.

### 7.2 Human Accountability

Every piece of data in the product is attributable to a human actor. The product does not create data autonomously. The AI Agent does not create data at all.

### 7.3 Progressive Disclosure

The product reveals complexity progressively. Basic operations are simple. Advanced capabilities are available but not forced.

### 7.4 Institutional Memory

The product preserves institutional knowledge. Deleted data is soft-deleted. History is retained. Personnel changes do not erase organizational memory.

---

## 8. Product Success Metrics

### 8.1 Adoption Metrics

- Active users / total eligible users
- Daily active users / weekly active users
- Module utilization distribution

### 8.2 Data Quality Metrics

- Record completeness (required fields populated)
- Timeliness (events logged within expected windows)
- Attachment rate (documents linked to entities)

### 8.3 Efficiency Metrics

- Time to complete common tasks
- Search-to-result latency
- Agent query satisfaction rate

### 8.4 Reliability Metrics

- Availability (per DOC-007 SLOs)
- Error rate
- Data integrity incidents

### 8.5 Metric Classification

Metrics are classified by enforcement level:

| Classification | Definition | Example |
|----------------|------------|---------|
| Observational | Monitored for insight; no release gate | Adoption rate, module utilization |
| Enforced | Tied to SLO or release gate; violation blocks deployment | Availability, API P95 latency |

Observational metrics inform product decisions. Enforced metrics are governed by DOC-007 and DOC-012.

---

## 9. Relationship to Canonical Baseline

### 9.1 Binding Documents

This product document is bound by:
- DOC-001: System Identity & Non-Negotiable Principles
- DOC-002: Authority, Trust & Decision Boundaries
- DOC-005: Security, Privacy & Data Handling Constitution
- DOC-006: Authorization Model & RBAC Specification
- DOC-007: Performance, Reliability & SLO Constitution

### 9.2 Conformance Requirement

This document and all product decisions must conform to the canonical baseline. Non-conformance is a governance defect requiring remediation.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 18:00:00 CST | Claude (acting CPO) | Initial draft of Product Identity document |
| v1.0 | 2026-01-23 18:00:00 CST | Claude (acting CPO) | Promotion to Canonical Product Baseline |
| v1.1 | 2026-01-23 18:35:00 CST | Claude (acting CPO) | Added metric classification (§8.5) per Canon Hardening Pass |
| v1.2 | 2026-01-23 16:21:00 CST | Product Leadership | Canon hardening pass (audit alignment, authority clarification, timestamp governance) |

---

End of Document
