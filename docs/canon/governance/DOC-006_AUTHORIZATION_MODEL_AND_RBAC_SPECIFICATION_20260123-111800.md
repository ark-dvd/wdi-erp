---
Canonical Document ID: DOC-006
Document Title: Authorization Model & RBAC Specification
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 11:18:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 11:18:00 CST
Last Updated: 2026-01-23 11:18:00 CST
Current Version: v1.0
---

# DOC-006 — Authorization Model & RBAC Specification

---

## 1. Purpose

This document defines the authorization model that governs access to data and functionality within the WDI ERP system.

Authentication answers "who are you?" Authorization answers "what may you do?" These are distinct concerns. This document addresses the latter.

Authorization is not optional. Every operation that accesses data or changes state must pass through the authorization model. There are no exceptions.

---

## 2. Authorization Principles

### 2.1 Role-Based Access Control

Authorization in the WDI ERP system is role-based. Users do not receive permissions directly. Users are assigned roles, and roles carry permissions.

This indirection is intentional:
- Roles represent job functions, not individuals
- Permission changes propagate through role updates
- User assignment changes do not require permission reconfiguration
- Audit trails show role-based access patterns

### 2.2 Explicit Grant Model

All permissions are explicitly granted. The default state is "no access."

A user without any role assignment has no permissions. A role without any permission grants provides no access. Access exists only where it has been explicitly defined.

### 2.3 Uniform Enforcement

Authorization is enforced uniformly across all access paths:
- User interface
- API endpoints
- Background jobs
- AI agent queries
- Internal service calls

If a user cannot perform an action through the UI, they cannot perform it through any other path. The enforcement point may differ, but the authorization decision must be identical.

### 2.4 Server-Side Authority

The server is the sole authority for authorization decisions. Client-side checks exist for user experience only and have no security value.

Any client-side permission check must be duplicated on the server. The server check is authoritative; the client check is cosmetic.

---

## 3. Authorization Layers

Authorization operates at multiple layers, from coarse to fine:

### 3.1 Organization Layer

The top-level boundary. Users belong to one organization. Cross-organization data access is forbidden.

This layer is implicit in the current single-organization deployment but must be enforced in the data model for future-proofing and defense in depth.

### 3.2 Module Layer

Permissions are scoped to system modules. A user may have access to Projects but not to HR. Module-level permissions gate entry to entire functional areas.

Modules in the current system:
- Projects
- Events (operational journal)
- HR / Personnel
- Vendors
- Vehicles
- Equipment
- Documents (as attached to other entities)
- Administration
- AI Agent

### 3.3 Feature Layer

Within a module, permissions are scoped to features. A user may view projects but not create them. Feature-level permissions distinguish between read, write, and administrative operations.

Standard feature permissions:
- `view` — Read access to data
- `create` — Ability to create new records
- `edit` — Ability to modify existing records
- `delete` — Ability to soft-delete records
- `admin` — Administrative operations (configuration, bulk actions)

### 3.4 Screen Layer

Some screens within a module may have additional permission requirements. A user may access the Projects module but be restricted from the financial summary screen.

Screen-level permissions are optional refinements, not replacements for module and feature permissions.

### 3.5 Field Layer (Future-Ready)

The authorization model is designed to support field-level permissions in the future. A user may view a record but be restricted from seeing specific sensitive fields.

Field-level permissions are not currently implemented but the data model must not preclude their addition.

---

## 4. Role Model

### 4.1 Role Definition

A role is a named collection of permissions representing a job function or access profile.

Role attributes:
- Unique identifier
- Display name
- Description
- Active/inactive status
- Permission grants

Roles are system-defined. User-created custom roles may be supported in the future but are not currently permitted.

### 4.2 Standard Roles

The system defines the following standard roles:

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| Founder | Full system access | All permissions |
| CEO | Executive access | All operational permissions |
| Office Manager | Administrative operations | HR, Vendors, Vehicles, Equipment admin |
| Department Manager | Department-scoped management | Projects, Events, Personnel view and edit |
| Project Manager | Project-scoped operations | Projects admin, Events create/edit |
| Secretary | Administrative support | Events create, Documents upload, view access |
| Employee | Basic operational access | View access, limited create |

Role definitions may be amended through formal change control.

### 4.3 Role Assignment

Users are assigned to roles by authorized administrators. A user may have multiple roles. Permissions are additive across roles.

Role assignment requires:
- Authorization to manage user roles
- Audit log entry recording the assignment
- Effective date (immediate or scheduled)

Role removal follows the same requirements.

### 4.4 Permission Resolution

When a user attempts an operation, permission is resolved as follows:

1. Identify all roles assigned to the user
2. Collect all permissions granted by those roles
3. Check if any collected permission authorizes the requested operation
4. Grant access if authorized; deny otherwise

Permissions are purely additive. There is no "deny" permission that overrides grants. If conflicting access levels exist across roles, the most permissive grant applies.

---

## 5. Enforcement Rules

### 5.1 No UI-Only Enforcement

UI elements may be hidden or disabled based on permissions, but this is not security enforcement. Security enforcement occurs at the API layer.

A malicious or malfunctioning client can send any request. The server must reject unauthorized requests regardless of what the UI displayed.

### 5.2 Mandatory Server-Side Checks

Every API endpoint that accesses data or modifies state must:
1. Verify authentication (who is making the request)
2. Verify authorization (is this user permitted this operation)
3. Proceed only if both checks pass

Authorization checks must occur before any data access or mutation logic executes.

### 5.3 Agent Authorization

The AI agent is subject to the same authorization model as any other system component.

Agent-specific constraints:
- The agent operates in the context of the requesting user
- The agent may only access data the user is authorized to view
- The agent may never perform write operations regardless of user permissions
- Agent authorization failures are logged identically to user authorization failures

### 5.4 Service Account Authorization

Background jobs and internal services operate under service accounts. Service accounts:
- Have explicitly defined, minimal permissions
- Are subject to the same authorization checks as user accounts
- Generate audit logs for all operations
- Do not have implicit "system" privileges

### 5.5 Authorization Failure Handling

When authorization fails:
- The operation is rejected
- An audit log entry is created recording the attempt
- The response indicates authorization failure without leaking permission details
- Repeated failures may trigger security alerts

---

## 6. Audit Requirements

### 6.1 Permission Change Logging

All changes to the authorization model are logged:
- Role creation, modification, deletion
- Permission grant or revocation
- User role assignment or removal

Logs capture: actor, action, target, timestamp, before state, after state.

### 6.2 Access Decision Logging

Authorization decisions for sensitive operations are logged:
- Access to Confidential or Restricted data
- Administrative operations
- Failed authorization attempts

Logs capture: user, requested operation, decision (grant/deny), timestamp.

### 6.3 Log Immutability

Authorization audit logs are immutable. They may not be modified or deleted outside of documented retention policy.

---

## 7. Scope Boundaries

### 7.1 In Scope

- Role-based access control model
- Permission structure and hierarchy
- Role definitions and assignment rules
- Enforcement requirements
- Audit requirements for authorization

### 7.2 Explicitly Out of Scope

- Authentication mechanisms (see Security document)
- Specific permission values for each role (operational configuration)
- UI implementation of permission-based display
- Business rules that determine role assignment eligibility

### 7.3 Intentionally Excluded

The following authorization patterns are explicitly rejected:

- Direct user-to-permission grants bypassing roles
- Implicit permissions based on data ownership without explicit grant
- Permission inheritance through organizational hierarchy without role assignment
- Time-unlimited elevated access grants
- Authorization decisions cached beyond request scope

---

## 8. Implications for Implementation

### 8.1 Backend

- Every route handler must include authorization middleware
- Authorization middleware must run after authentication, before business logic
- Permission checks must reference the canonical authorization service
- Authorization failures must return consistent error responses
- Bulk operations must verify authorization for each affected record

### 8.2 Frontend

- UI must fetch user permissions on session initialization
- UI must hide or disable unauthorized actions
- UI must handle authorization errors gracefully
- Permission cache must be invalidated on role changes
- UI permission checks are UX only; never trust them for security

### 8.3 Data

- Role and permission definitions must be stored in the database
- User-role assignments must be stored with audit fields
- Permission resolution must be queryable for reporting
- Role changes must trigger cache invalidation signals

### 8.4 Infrastructure

- Authorization service must be highly available
- Authorization latency must not significantly impact request performance
- Authorization service failures must fail closed (deny access)
- Permission data must be included in backup and recovery procedures

### 8.5 AI / Agent

- Agent must receive user context with every request
- Agent must call authorization service for data access decisions
- Agent must never cache authorization decisions across requests
- Agent must log authorization context with all queries

---

## 9. Explicit Anti-Patterns

The following patterns are forbidden. Implementations exhibiting these patterns are defective.

| Anti-Pattern | Violation |
|--------------|-----------|
| Checking permissions only in UI code | Violates server-side enforcement |
| Hardcoding user IDs for special access | Violates role-based model |
| Granting permissions directly to users | Violates role indirection |
| Assuming service calls are authorized | Violates uniform enforcement |
| Caching authorization decisions indefinitely | Violates authorization freshness |
| Creating "god mode" roles with implicit all-access | Violates explicit grant model |
| Allowing authorization bypass for "testing" | Violates uniform enforcement |
| Failing open on authorization service errors | Violates security principles |
| Logging permission details in error responses | Violates information disclosure |
| Allowing the agent to inherit admin permissions | Violates agent constraints |
| Skipping authorization for "read-only" operations | Violates uniform enforcement |
| Trusting client-reported permissions | Violates server-side authority |

---

## 10. Governance

This document defines the binding authorization model. All access control implementations must conform to this specification.

Changes to role definitions or permission structures require:
- Documented justification
- Security review
- Appropriate authority approval
- Audit trail of the change

Implementations that deviate from this model without documented exception are non-compliant.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 11:18:00 CST | Claude (acting CTO) | Initial pre-canonical draft authored under the established governance standard |
| v1.0 | 2026-01-23 11:18:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
