---
Product Document ID: P004
Document Title: Feature Taxonomy & Modular Boundaries
Document Type: Product Canon
Status: Canonical
Author: Product Leadership
Owner: Product Leadership
Signatory: Chief Product Officer (CPO)
Canonical Conformance Review: Chief Technology Officer (CTO)
Authority Level: Product Canon
Authority Relationship: Subordinate to Technical & Governance Canon
Timezone: America/Chicago (CST)
Created At: 2026-01-23 18:15:00 CST
Last Updated: 2026-01-23 16:21:00 CST
Current Version: v1.2
---

# P004 — Feature Taxonomy & Modular Boundaries

---

## 1. Purpose

This document defines the product's functional organization—how capabilities are grouped into modules, how modules relate to each other, and how new functionality is classified and introduced.

Module boundaries are not arbitrary. They reflect authorization scopes, navigation architecture, and the principle that complexity should be contained, not scattered.

---

## 2. Module Taxonomy

### 2.1 Core Modules

Core modules represent the primary functional areas of the product. Each module has its own authorization scope, navigation entry point, and data domain.

| Module | Purpose | Primary Entities |
|--------|---------|------------------|
| Projects | Construction and infrastructure project management | Project, MegaProject, Quarter, Building |
| Events | Operational event logging and history | Event, EventAttachment |
| HR | Personnel and organizational management | Employee, Department, Position |
| Vendors | Vendor and contractor management | Organization, Contact, Rating |
| Vehicles | Fleet management | Vehicle, VehicleAssignment, VehicleDocument |
| Equipment | Asset tracking | Equipment, EquipmentAssignment |
| Documents | File management (attached context only) | Document, Attachment |
| Administration | System configuration and user management | User, Role, Permission, SystemConfig |
| AI Agent | Intelligent query interface | Query, Response (ephemeral) |

### 2.2 Module Hierarchy

```
WDI ERP
├── Operations
│   ├── Projects (hierarchical: mega → quarter → building)
│   ├── Events (cross-cutting journal)
│   └── Documents (always attached)
├── Resources
│   ├── HR / Personnel
│   ├── Vendors / Contacts
│   ├── Vehicles
│   └── Equipment
├── Intelligence
│   └── AI Agent
└── System
    └── Administration
```

### 2.3 Module Characteristics

| Module | CRUD | Search | Hierarchy | Attachments | Agent-Queryable |
|--------|------|--------|-----------|-------------|-----------------|
| Projects | Yes | Yes | Yes (3 levels) | Yes | Yes |
| Events | Yes | Yes | No | Yes | Yes |
| HR | Yes | Yes | Yes (org structure) | Yes | Yes |
| Vendors | Yes | Yes | Yes (org → contact) | Yes | Yes |
| Vehicles | Yes | Yes | No | Yes | Yes |
| Equipment | Yes | Yes | No | Yes | Yes |
| Documents | Create/Delete | Yes | No | N/A | Yes |
| Administration | Yes | Limited | No | No | No |
| AI Agent | Read-only | Query | No | No | N/A |

---

## 3. Cross-Module Dependencies

### 3.1 Allowed Dependencies

Some modules legitimately reference others. These dependencies are intentional and supported.

| From Module | To Module | Dependency Type | Example |
|-------------|-----------|-----------------|---------|
| Events | Projects | Required Reference | Event linked to project |
| Documents | Any | Required Reference | Document attached to entity |
| Vendors.Rating | Projects | Required Reference | Rating specific to project context |
| Vehicles.Assignment | HR | Required Reference | Vehicle assigned to employee |
| Equipment.Assignment | HR | Required Reference | Equipment assigned to employee |
| AI Agent | All | Read Reference | Agent queries across modules |

### 3.2 Forbidden Dependencies

Some cross-module patterns are explicitly forbidden.

| Pattern | Reason |
|---------|--------|
| Events creating Projects | Events are journal entries, not project lifecycle management |
| Vendors modifying HR | Vendors are external entities; HR is internal |
| Documents without parent | Orphan documents violate DOC-001 §4.3 |
| AI Agent modifying any | Agent is read-only per DOC-001 §3.3 |
| Administration bypassing authorization | Admin operations follow same RBAC model |

### 3.3 Dependency Direction Rules

- Operational modules (Projects, Events) may reference Resource modules (HR, Vendors, Vehicles, Equipment)
- Resource modules may reference each other through assignment patterns
- Documents module is always a child; it never stands alone
- AI Agent reads from all; writes to none
- Administration manages Users and Roles; does not manage operational data

---

## 4. Feature vs Configuration

### 4.1 Feature Definition

A **feature** is a user-facing capability that:
- Appears in the UI as an action or view
- Requires development effort to implement
- Has associated permissions
- May require database schema changes
- Is documented in product specifications

Examples: Project creation, Event logging, Vendor rating, Agent query

### 4.2 Configuration Definition

A **configuration** is a system setting that:
- Modifies feature behavior without code changes
- Is managed through Administration module
- Does not add new capabilities
- Does not require deployment
- Is controlled by authorized administrators

Examples: Event type list, Rating criteria, Default filters

### 4.3 Classification Rules

| Characteristic | Feature | Configuration |
|----------------|---------|---------------|
| Requires code change | Yes | No |
| Requires deployment | Yes | No |
| Adds new UI elements | Yes | No |
| Modifies existing behavior | Maybe | Yes |
| Managed by Product | Yes | No |
| Managed by Administrator | No | Yes |
| Has version history | Yes (releases) | Yes (audit trail) |

### 4.4 Configuration Boundaries

Configuration can modify:
- List values (event types, categories, statuses)
- Default settings (page sizes, sort orders)
- Feature toggles (enable/disable within deployed code)
- Display preferences (visible columns, field order)

Configuration cannot:
- Add new modules
- Add new entity types
- Change authorization model
- Modify audit trail behavior
- Bypass security constraints

---

## 5. Feature Layers

### 5.1 Layer Model

Features exist at multiple layers within each module.

| Layer | Scope | Example |
|-------|-------|---------|
| Module | Access to entire functional area | "Can access Projects" |
| Feature | Specific capability within module | "Can create projects" |
| Screen | Specific view or interface | "Can access financial summary" |
| Field | Specific data element (future) | "Can view salary field" |

### 5.2 Permission Mapping

Features map to standard permission types per DOC-006:

| Permission | Feature Capability |
|------------|-------------------|
| `view` | Read existing records |
| `create` | Create new records |
| `edit` | Modify existing records |
| `delete` | Soft-delete records |
| `admin` | Module configuration, bulk operations |

### 5.3 Feature Completeness

A feature is complete when it includes:
- UI implementation (Hebrew RTL)
- API endpoint
- Authorization check
- Validation rules
- Audit trail integration
- Error handling
- Agent queryability (for data features)

Partial implementations are not features; they are work-in-progress.

---

## 6. Module Introduction Process

### 6.1 New Module Criteria

A new module may be introduced when:
- The capability does not fit within existing modules
- The capability has its own authorization boundary
- The capability manages distinct entity types
- The capability serves a clear operational need
- The capability conforms to canonical constraints

### 6.2 New Module Rejection Criteria

A new module proposal is rejected when:
- The capability violates system identity (DOC-001 §2.2)
- The capability can be implemented within an existing module
- The capability adds complexity without operational value
- The capability requires external user access
- The capability enables autonomous data mutation

### 6.3 Module Introduction Process

1. **Proposal**: Document the module's purpose, entities, and boundaries
2. **Canonical Review**: Verify conformance with DOC-001 through DOC-012
3. **Architecture Review**: Verify integration with existing modules
4. **Authorization Design**: Define permission model per DOC-006
5. **Approval**: Product Owner and Engineering Leadership approval
6. **Implementation**: Standard development process
7. **Documentation**: Update this document and related canon

---

## 7. Feature Introduction Process

### 7.1 Feature Request Evaluation

Feature requests are evaluated against:

| Criterion | Question |
|-----------|----------|
| Scope | Does this belong in the product? (P001) |
| Module | Which module owns this feature? |
| Users | Who uses this feature? (P002) |
| Journey | How does this fit user journeys? (P003) |
| Authorization | What permissions are required? (DOC-006) |
| Data | What entities are affected? (DOC-010) |
| Security | Any security implications? (DOC-005) |
| Observability | What logging is required? (DOC-008) |

### 7.2 Feature Rejection Criteria

Features are rejected when:
- They violate canonical constraints
- They belong outside product scope
- They add complexity without proportional value
- They cannot be implemented within SLO constraints
- They require capabilities explicitly excluded in P001

### 7.3 Feature Lifecycle

Features follow this lifecycle:

| Stage | Description |
|-------|-------------|
| Proposed | Under consideration; not committed |
| Approved | Committed to implementation; in backlog |
| In Development | Being implemented |
| In Testing | Implementation complete; validating |
| Released | Available in production |
| Deprecated | Scheduled for removal |
| Removed | No longer available |

---

## 8. Module Boundaries in UI

### 8.1 Navigation Structure

Each core module has a primary navigation entry point:
- Sidebar menu item
- Distinct icon
- Hebrew label

### 8.2 Module Context

When a user is within a module:
- Breadcrumb indicates current location
- Actions are scoped to module context
- Cross-module navigation requires explicit action
- Search defaults to current module (with global option)

### 8.3 Cross-Module Display

When displaying cross-module references:
- Related entities show as links
- Links navigate to the owning module
- Read-only display within current context
- Edit requires navigation to owning module

---

## 9. Current Module Status

### 9.1 Implemented Modules

| Module | Status | Notes |
|--------|--------|-------|
| Projects | Production | Hierarchical structure complete |
| Events | Production | 7 event types, attachments, PWA |
| HR | Production | Employee profiles, documents |
| Vendors | Production | Organizations, contacts, project ratings |
| Vehicles | Production | CRUD, assignment tracking, documents |
| Equipment | Production | Basic CRUD; lacks tabbed interface |
| Documents | Production | Attached to entities |
| Administration | Production | User management, roles |
| AI Agent | Production | WDI Agent using Gemini 3 Flash |

### 9.2 Known Gaps

| Module | Gap | Status |
|--------|-----|--------|
| Equipment | Missing tabbed interface (history, documents) | Planned |
| Vehicles | Activity logging integration | Planned |
| AI Agent | Vehicle module connectivity | Planned |

---

## 10. Relationship to Canonical Baseline

### 10.1 Binding Documents

This product document is bound by:
- DOC-001: System Identity (scope constraints)
- DOC-003: Architecture Constitution (module structure)
- DOC-006: Authorization Model (permission boundaries)
- DOC-010: Data Model (entity definitions)
- DOC-011: API Contract (interface standards)

### 10.2 Conformance Requirement

All module and feature definitions must conform to the architectural and authorization models. Features that require canonical exceptions must be escalated to canonical amendment process.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 18:15:00 CST | Claude (acting CPO) | Initial draft of Feature Taxonomy & Modular Boundaries |
| v1.0 | 2026-01-23 18:15:00 CST | Claude (acting CPO) | Promotion to Canonical Product Baseline |
| v1.1 | 2026-01-23 18:35:00 CST | Claude (acting CPO) | Aligned with Canon Hardening Pass (no content changes required) |
| v1.2 | 2026-01-23 16:21:00 CST | Product Leadership | Canon hardening pass (audit alignment, authority clarification, timestamp governance) |

---

End of Document
