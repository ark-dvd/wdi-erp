---
Canonical Document ID: DOC-016
Document Title: Authorization Invariants & Enforcement Constitution (RBAC v2 Lock)
Document Type: Canonical
Status: Canonical — Binding
Baseline Reference: Extends Canonical Baseline v1.2
Authority: DOC-006, DOC-013 v2.0, DOC-014 v2.0, DOC-008, DOC-005
Canonical Source Verification:
  DOC-013: SHA256 5a5e7298009036f1c63ffb0145414590229e0290b8ac3490ffde4b81fa596cb1
  DOC-014: SHA256 834a0c86174e9c9918eabb1b406f5f91e433834c64efaa7eef0a99efb9011db2
Scope: Applies to API, Admin UI, Agent, DB seed, future modules
Foundation Documents: DOC-006 (Authorization Model), DOC-013 (Authorization Matrix & Policy), DOC-014 (Authorization Matrix v2)
Owner: Product / Engineering Leadership
Signatory: Chief Technology Officer (CTO)
Timezone: America/Chicago (CST)
Created At: 2026-02-02 13:33:22 CST
Last Updated: 2026-02-02 14:00:26 CST
Current Version: v2.0
---

# DOC-016 — Authorization Invariants & Enforcement Constitution (RBAC v2 Lock)

---

## 1. Purpose & Non-Negotiable Authority

### 1.1 Document Intent

This document codifies the immutable authorization invariants of the WDI ERP system under RBAC v2. It establishes the laws that all authorization implementations, remediation plans, and future extensions MUST obey.

Where DOC-006 defines the authorization *model*, DOC-013 defines the authorization *matrix*, and DOC-014 renders the *exhaustive permissions*, this document defines the **enforcement constitution** — the invariants that bind all three together and govern how they are applied.

### 1.2 Binding Force

This document is binding on:

- All API route handlers (operational, admin, agent, upload, background jobs)
- All authorization evaluation code (middleware, permission resolvers, scope checkers)
- All administrative UI that displays or modifies authorization state
- All WDI Agent access control logic
- All database seed scripts and migration scripts affecting RBAC tables
- All remediation plans, implementation plans, and code reviews touching authorization
- All future modules added to the system

Non-compliance with any provision of this document constitutes a governance defect with minimum severity HIGH. Provisions marked CRITICAL carry mandatory immediate remediation.

### 1.3 Precedence

This document operates within the constraints of DOC-006 (Authorization Model) and DOC-013 (Authorization Matrix & Operational Policy). If any provision of this document appears to conflict with DOC-006, DOC-006 prevails unconditionally. If any provision appears to conflict with DOC-013, DOC-013 prevails unconditionally.

This document overrides:

- All remediation plans and implementation plans that contradict its provisions
- All implementation interpretations that deviate from its invariants
- All historical code patterns that violate its forbidden-pattern list

### 1.4 Default Deny as Constitutional Principle

The default authorization state is **no access**. This is not a configuration. This is a constitutional principle.

A user without a role has no permissions. A role without explicit grants has no permissions. A permission not explicitly granted does not exist. Absence of denial is not presence of grant. This principle is absolute, unconditional, and applies to every access path without exception.

---

## 2. Canonical Definitions

### 2.1 Authoritative Glossary

The following terms are defined for the purposes of this document and all authorization-related governance. Where historical code uses different terminology, the canonical term governs interpretation.

| Term | Canonical Definition |
|------|---------------------|
| **Permission** | An explicit grant allowing a specific operation on a specific module within a defined scope. Expressed as `module:operation:scope` (DOC-013 §7.1). Permissions exist only where explicitly recorded in the database. |
| **Role** | A named collection of permissions representing a job function. Users hold exactly one role at any time (DOC-013 §3.2). The system defines exactly ten roles (DOC-013 §4.1). |
| **Module** | A functional area of the system with its own data entities, API routes, and access patterns. The system defines exactly eleven modules (DOC-013 §6.1). |
| **Operation** | An action performed on module data. The four canonical operations are: `READ`, `CREATE`, `UPDATE`, `DELETE` (DOC-013 §7.1). |
| **Scope** | A boundary that limits the extent of a permission grant to specific data instances. The six canonical scopes are: `ALL`, `DOMAIN`, `ASSIGNED`, `OWN`, `SELF`, `MAIN_PAGE` (DOC-013 §5.1). |
| **Target Entity** | The specific data record or set of records against which an authorization decision is evaluated. Scope determines which target entities fall within a permission's boundary. |
| **Assignment Identity** | An authoritative database record that establishes a user's operational relationship to a target entity. For projects: Project.leadId, ProjectManager record, ProjectCoordinator record, or team membership record. Assignment identity is the sole basis for ASSIGNED scope resolution. |
| **Identity Linkage** | The database relationship between a User record and an Employee record (User.employeeId → Employee.id). Identity linkage is a prerequisite for scope resolution but does not itself constitute assignment. |
| **Effective Permissions** | The complete set of permissions a user holds by virtue of their role, as recorded in the database (Role → RolePermission → Permission). Effective permissions are a static property of the role assignment, independent of runtime context. |
| **Usable Permissions** | The subset of effective permissions that a user can currently exercise, considering their assignment state, domain membership, and entity ownership. Usable permissions are a dynamic property that depends on both the role and the user's operational context. |
| **Enforcement Point** | A server-side code location where an authorization decision is made. Every API route that accesses data or modifies state MUST contain at least one enforcement point. |
| **Authorization Engine** | The single code path responsible for all authorization decisions. The target state is one engine for all routes, all modules, all access paths. |

### 2.2 Scope Terminology Reconciliation

The canonical scope term is `ASSIGNED` (DOC-013 §5.1). This scope applies to **any entity type** where the user has an explicit assignment — not only projects.

If historical code uses aliases such as `PROJECT`, `checkProjectAssignment`, or similar per-module scope functions, the canonical interpretation is:

- The alias refers to the ASSIGNED scope as applied to the projects module.
- The alias MUST NOT be interpreted as a separate scope definition.
- Future scope resolution MUST be generic across entity types, not per-module.
- Existing per-module aliases MAY remain in code during transition but MUST NOT be treated as authoritative scope definitions.

---

## 3. Authorization Invariants

The following invariants are constitutional. They are numbered for reference and MUST be cited in code reviews, remediation plans, and audit findings.

### INV-001: READ Does Not Imply WRITE

A permission grant for READ on any module at any scope MUST NOT be interpreted as granting CREATE, UPDATE, or DELETE access. Write access requires its own explicit grant. This invariant is absolute and has no exceptions.

**Canonical basis:** DOC-013 §3.6, §5.2 S-001.

### INV-002: Write Access Requires Explicit Grant at Correct Scope

Every API route that performs a CREATE, UPDATE, or DELETE operation MUST verify that the requesting user holds an explicit write grant (the specific operation) for the target module at a scope that includes the target entity. A user who can read all projects but has write access only to assigned projects MUST be denied write access to unassigned projects.

**Canonical basis:** DOC-006 §2.2 (Explicit Grant Model), DOC-013 §7.1.

### INV-003: Scope Boundaries Are Enforced Server-Side Only

All scope evaluation — determining whether a target entity falls within ALL, DOMAIN, ASSIGNED, OWN, SELF, or MAIN_PAGE — MUST occur on the server. Client-side scope assertions have no security value and MUST NOT be accepted as inputs to authorization decisions.

**Canonical basis:** DOC-006 §2.4 (Server-Side Authority), DOC-013 §3.3.

### INV-004: Missing Authorization Check Is a Security Defect

Any API route that accesses data or modifies state without an authorization check is defective. The severity of this defect is CRITICAL for write routes and HIGH for read routes. There are no exceptions for "internal" routes, "utility" endpoints, or "simple" operations.

**Canonical basis:** DOC-006 §5.2 (Mandatory Server-Side Checks).

### INV-005: Permissions Are Additive, No Deny Overrides

Permissions are purely additive. There is no "deny" permission that overrides grants. If a role grants a permission, that permission is held. The most permissive applicable grant governs.

**Canonical basis:** DOC-006 §4.4.

### INV-006: Client Assertions Are Not Authorization Inputs

No authorization decision may depend on client-provided values for module, operation, scope, parent entity, or any other authorization-relevant context without independent server-side verification. The server MUST independently determine the authorization context from its own data.

**Canonical basis:** DOC-006 §2.4, §5.1, §9 (anti-pattern: "Trusting client-reported permissions").

### INV-007: Single Role Per User

Users hold exactly one role at any time. Roles are mutually exclusive. Permission resolution evaluates the permissions of exactly one role. There is no union across multiple roles.

**Enforcement clause:** A database state where a user has multiple role assignment rows, or a session object that loads permissions from more than one role, is a CRITICAL defect. The authorization engine MUST evaluate exactly one role per user per authorization decision. Any code path that unions permissions across multiple roles violates this invariant and MUST be treated as a privilege escalation vector.

**Canonical basis:** DOC-013 §3.2, §4.2 R-003.

### INV-008: Authorization Failures Fail Closed

If the authorization engine encounters an error, an ambiguous state, or a missing permission record, the result is DENY. Authorization MUST NOT fail open under any circumstance.

**Canonical basis:** DOC-006 §8.4 (fail closed), DOC-005 §2.1 (Least Privilege by Default).

### INV-009: Single Authorization Engine Is the Target State

The system MUST converge on a single code path for all authorization decisions. Parallel authorization engines, supplementary permission checks, and redundant evaluation paths are defects. While transition may require temporary coexistence, the target state is one engine, and no new route may be created against a non-target engine.

**Canonical basis:** DOC-006 §2.3 (Uniform Enforcement), DOC-013 §3.4.

### INV-010: Database State Is the Sole Source of Permission Truth

Role definitions, permission grants, and user-role assignments MUST be stored in the database. Hardcoded role arrays, in-memory permission matrices, and configuration-file permission lists are defects. The database is the sole source of truth for what permissions exist.

**Canonical basis:** DOC-013 §9.1 (Data-Driven RBAC).

### INV-011: Role Names and Count Must Match Canon

The database MUST contain exactly ten (10) roles with role IDs matching DOC-014 §2 exactly: `owner`, `executive`, `trust_officer`, `pmo`, `finance_officer`, `domain_head`, `project_manager`, `project_coordinator`, `administration`, `all_employees`. Any deviation in name, count, or ID is a data integrity defect with CRITICAL severity.

**Canonical basis:** DOC-013 §4.1, DOC-014 §2.

### INV-012: Uniform Enforcement Across All Access Paths

Authorization is enforced identically across all access paths: UI-initiated API calls, direct API calls, background jobs, Agent queries, internal service calls, and any future access path. No path receives implicit trust or relaxed enforcement.

**Canonical basis:** DOC-006 §2.3, DOC-013 §3.4.

---

## 4. Assignment & Scope Enforcement Constitution

### 4.1 Identity Linkage vs. Assignment State

Identity linkage and assignment state are **distinct concepts** that MUST NOT be conflated.

**Identity Linkage** (User ↔ Employee):
- Establishes *who the user is* in the organizational model.
- Stored as: `User.employeeId → Employee.id`.
- Is a **prerequisite** for evaluating ASSIGNED, OWN, SELF, and DOMAIN scopes.
- Without identity linkage, scoped permission evaluation MUST return DENY for any scope narrower than ALL.
- Identity linkage alone does NOT grant any access to any entity.

**Assignment State** (Employee ↔ Entity):
- Establishes *what the user is assigned to* in the operational model.
- Stored as: `Project.leadId`, `ProjectManager` record, `ProjectCoordinator` record, team membership records, or equivalent assignment tables for other entity types.
- Is the **authoritative source** for ASSIGNED scope resolution.
- A user with identity linkage but zero assignment records has ASSIGNED scope that resolves to an empty set.

**Constitutional rule:** Any authorization system that treats identity linkage as sufficient for ASSIGNED scope is defective. Both identity linkage AND assignment records MUST be present and valid for ASSIGNED scope to resolve to a non-empty set.

### 4.2 Scope Evaluation Rules

Scope evaluation determines whether a target entity falls within the boundary of a permission grant. The following rules govern scope evaluation for each canonical scope:

**ALL**: No boundary. All instances of the entity type are included. No additional conditions.

**DOMAIN**: The target entity must belong to the same functional domain as the user. Domain membership is determined by the user's Employee record and organizational structure. If the user has no domain assignment, DOMAIN scope resolves to an empty set.

**ASSIGNED**: The target entity must be explicitly assigned to the user through an authoritative assignment record (per §4.1). ASSIGNED is defined as a generic scope concept that applies across entity types as an invariant — scope resolution MUST NOT be architecturally limited to a single entity type. In the current system, the canonical assignment sources are project-related: `Project.leadId`, `ProjectManager` record, `ProjectCoordinator` record, and team membership records. As additional entity types introduce assignment relationships, the same ASSIGNED scope semantics apply without requiring a new scope definition. If the user has no assignment records for the queried entity type, ASSIGNED scope resolves to an empty set.

**OWN**: The target entity must be created by or personally assigned to the user. Ownership is determined by the entity's creator field or personal assignment field. OWN scope requires identity linkage to determine "who the user is" for matching purposes.

**SELF**: The target entity must be the user's own personal record. SELF scope applies exclusively to the user's own HR card, personal equipment assignment, or personal vehicle assignment. SELF scope requires identity linkage.

**MAIN_PAGE**: A read-only scope that grants access to the list/table view of a module but not to individual record details. MAIN_PAGE scope MUST NOT grant access to card/detail views.

### 4.3 Read Path vs. Write Path Requirements

**Read path** (READ operation):
- Requires: a READ permission grant for the target module at a scope that includes the target entity.
- Scope may be broad (ALL, DOMAIN, MAIN_PAGE) to enable organizational visibility.

**Write path** (CREATE, UPDATE, DELETE operations):
- Requires: an explicit write grant (the specific operation) for the target module at a scope that includes the target entity.
- Write scope is always equal to or narrower than read scope for the same role and module (DOC-013 §3.6).
- For ASSIGNED-scoped writes, the user must hold an authoritative assignment record for the target entity. In the current system, this means project assignment records; as new entity types gain assignment relationships, the same principle extends without requiring new scope definitions.
- Write access MUST NOT be inferred from read access under any circumstance (INV-001).

**Document/attachment path** (file operations):
- Documents have no standalone module (DOC-013 §6.3 M-005).
- Document access follows the parent entity's permissions.
- Upload authorization MUST verify that the user has the appropriate write permission on the parent entity, determined server-side from the upload context, not from client assertions.

---

## 5. Agent Access Constitution

### 5.1 Permanent Constraints

The WDI Agent is subject to the following permanent, non-configurable constraints:

**AG-001**: The Agent is permanently **read-only**. It MUST NOT perform CREATE, UPDATE, or DELETE operations regardless of the requesting user's permissions. This constraint is architectural, not role-based, and applies even to the Owner role.

**AG-002**: The Agent operates within the requesting user's **READ permissions exclusively**. The Agent MUST filter the user's permission set to extract only READ grants. Write-only permissions (e.g., a hypothetical `module:create:ASSIGNED` without `module:read:*`) MUST NOT be used to derive Agent access.

**AG-003**: The Agent MUST enforce **scope boundaries** in query responses. If a user has `events:read:ASSIGNED` scope, the Agent MUST return data only from the user's assigned projects. The Agent MUST NOT return data outside the user's READ scope even if the query is phrased broadly.

**AG-004**: The Agent MUST NOT use hardcoded permission matrices, role-based lookup tables, or any authorization source other than the database-driven permission set delivered via the user's session. Any hardcoded Agent permission structure is a defect (INV-010).

**AG-005**: When a user queries the Agent about data they lack READ permission for, the Agent MUST respond honestly that the user lacks permission. The Agent MUST NOT fabricate data, hallucinate responses, or deny the existence of the data. The canonical response is: "אין לך הרשאה מתאימה." (DOC-013 §8.2 A-003).

### 5.2 Agent Authorization Derivation

The Agent derives its access as follows:

1. Read the user's effective permissions from the session (delivered at authentication).
2. Filter for READ grants only: retain only permissions where operation = `READ` (or `query` for the agent module itself).
3. For each retained permission, note the scope.
4. When executing a query, restrict data retrieval to entities that fall within the applicable READ scope.
5. If no READ permission exists for the queried module, deny the query.

The Agent MUST NOT:
- Derive module access from write permissions.
- Bypass scope filtering for convenience.
- Cache authorization decisions across requests (DOC-006 §9).

---

## 6. Admin Console & Meta-Privileges Constitution

### 6.1 Admin Route Authorization Mapping

Admin routes MUST NOT use blanket authorization checks. Each admin endpoint MUST be mapped to a specific module and operation:

- `GET /api/admin/*` routes require `admin:READ` permission.
- `POST /api/admin/*` routes require `admin:CREATE` permission.
- `PATCH /api/admin/*` or `PUT /api/admin/*` routes require `admin:UPDATE` permission.
- `DELETE /api/admin/*` routes require `admin:DELETE` permission.

Per DOC-014 §5.1–5.3:
- Owner: admin READ, CREATE, UPDATE, DELETE (full CRUD).
- Executive: admin READ only.
- Trust Officer: admin READ only.
- All other roles: no admin access.

A blanket `checkAdminAccess()` that grants uniform access to all admin routes is a defect. Each route MUST check the specific operation it performs.

### 6.2 Admin UI Is Not Security

Hiding admin menu items, disabling admin buttons, or restricting admin navigation in the UI is a UX convenience. It has zero security value. Every admin API endpoint MUST enforce authorization server-side regardless of what the UI displays (DOC-006 §5.1, INV-003).

### 6.3 RBAC Configuration Authority

Only the following roles may modify RBAC configuration (DOC-013 §9.2):

- **Owner**: Full RBAC administrative authority.
- **Trust Officer**: Role assignment authority, excluding assignment of the Owner role (DOC-013 §9.2 G-001).

No other role may assign roles, modify permissions, or alter RBAC configuration. Any code that permits RBAC modification by unauthorized roles is a CRITICAL defect.

RBAC configuration mutation (role assignment, permission changes) is additionally restricted by these governance rules (Owner and Trust Officer authority) and MUST NOT be inferred solely from the HTTP verb or admin module operation grant. A user with `admin:UPDATE` permission does not automatically hold RBAC mutation authority; RBAC mutation requires explicit governance authorization as defined above.

---

## 7. Observability & Audit Requirements

### 7.1 Authorization Decision Logging

Per DOC-008, every authorization decision for sensitive operations MUST be logged with sufficient detail for forensic audit:

| Field | Required | Description |
|-------|----------|-------------|
| Timestamp | MUST | ISO 8601 format, server clock |
| User ID | MUST | Requesting user identifier |
| Role | MUST | User's role at time of decision |
| Operation | MUST | READ, CREATE, UPDATE, or DELETE |
| Module | MUST | Target module identifier |
| Target Entity | MUST (if applicable) | Entity ID against which the decision was made |
| Scope Evaluated | SHOULD | Scope boundary that was checked |
| Decision | MUST | GRANT or DENY |
| Reason (on DENY) | SHOULD | Brief explanation of denial cause |

Authorization audit logs are immutable. They MUST NOT be modified or deleted outside of documented retention policy (DOC-006 §6.3).

### 7.2 Effective Permissions Display

The effective permissions display (admin UI) MUST reflect **database state**, not runtime evaluation:

- It MUST query Role → RolePermission → Permission tables directly.
- It MUST show the complete permission set granted by the user's role.
- It MUST indicate scope alongside each grant (e.g., "events:CREATE — ASSIGNED").
- It SHOULD separately indicate usable permissions by checking assignment state (e.g., "ASSIGNED — 3 projects assigned").
- It MUST NOT evaluate permissions through the authorization engine at display time, as this conflates enforcement with diagnostics.

The effective permissions display is a **diagnostic and audit tool**. Its accuracy is a governance requirement, not a UX preference.

### 7.3 RBAC Change Audit

All changes to RBAC state MUST generate audit records per DOC-013 §9.4:

| Change Type | Required Audit Fields |
|-------------|----------------------|
| Role assignment | Actor, target user, previous role, new role, timestamp, reason |
| Permission grant/revocation | Actor, role affected, permission added/removed, timestamp |
| Role definition change | Actor, role ID, fields changed, before state, after state, timestamp |

---

## 8. Forbidden Patterns

The following patterns are explicitly forbidden. Any implementation exhibiting these patterns is defective. The severity classification determines remediation urgency.

### FP-001: Trusting Client-Provided Authorization Context — CRITICAL

No authorization decision may depend on client-provided values for module, operation, scope, parent entity, or target entity without independent server-side verification. The server MUST determine authorization context from its own data model.

**Example violation:** An upload endpoint that accepts `{module: "events", entityId: "..."}` from the client and uses these values to check permissions without verifying the relationship server-side.

### FP-002: Parallel Authorization Engines in Production — CRITICAL

The system MUST NOT maintain multiple independent authorization evaluation paths in production. A state where Route A uses `authorization.ts`, Route B uses `permissions.ts`, and Route C uses a hardcoded matrix is a CRITICAL defect. All routes MUST converge on a single authorization engine.

### FP-003: Hardcoded Role Arrays as Security Gates — HIGH

Using hardcoded role name arrays (e.g., `['owner', 'trust_officer', 'executive']`) to gate access is a defect. Authorization decisions MUST be derived from permission grants in the database, not from role name matching. Role names are identifiers, not permission tokens.

**Canonical basis:** DOC-006 §9 (anti-pattern: "Hardcoding user IDs for special access" — same principle applies to role names).

### FP-004: Temporary Permission Shortcuts Without CTO Sign-Off — HIGH

No "temporary" permission bypass, elevated access, or relaxed enforcement may be introduced without explicit CTO sign-off recorded in canonical documentation. "We'll fix it later" is not authorization.

### FP-005: Knowledge/Visibility Mechanisms Enabling Writes — CRITICAL

Any mechanism that grants knowledge-level or visibility-level access MUST NOT enable CREATE, UPDATE, or DELETE operations. Visibility Grants are an explicitly rejected RBAC pattern in v2; read scope is built into roles. Any residual code path where a visibility or knowledge mechanism contributes to a write-access decision is a CRITICAL defect. Knowledge access is read-only by definition and carries no write authority.

### FP-006: Visibility Grants as an Active Mechanism — CRITICAL

Visibility Grants are an explicitly rejected RBAC pattern in v2; read scope is built into roles (DOC-013 §12.3). Any code that references, evaluates, checks, or relies on a VisibilityGrant table or equivalent mechanism is non-canonical and MUST be removed. This pattern MUST NOT be restricted, refactored, or made read-only — it MUST be removed entirely. There is no transitional state for Visibility Grants; their presence in the codebase or database is a defect.

### FP-007: Inferring Write Access from Read Access — CRITICAL

No code path may assume that a user who can read an entity can also write to it. READ and WRITE are independent permission checks. Any route that checks READ permission and then allows a WRITE operation without a separate WRITE check violates INV-001 and is a CRITICAL defect.

### FP-008: Scope Resolution Without Identity Linkage — HIGH

Any scope evaluation for ASSIGNED, OWN, SELF, or DOMAIN that does not first verify the user has a valid identity linkage (User.employeeId) MUST return DENY. Attempting scope resolution on a user without identity linkage produces undefined behavior and is a defect.

### FP-009: Agent Access via Hardcoded Permission Matrix — CRITICAL

Any Agent authorization logic that uses a hardcoded permission matrix, role-name lookup table, or any source other than the user's database-driven session permissions is a CRITICAL defect. The Agent derives access exclusively from the authorization engine (§5).

### FP-010: UI-Only Authorization Enforcement — HIGH

Any functional area where authorization is enforced only by hiding UI elements, with no corresponding server-side check, is a HIGH defect. UI enforcement is cosmetic. Server enforcement is security.

---

## 9. Enforcement Clause & Change Control

### 9.1 Defect Classification

Violations of this document are classified as follows:

| Severity | Definition | Remediation Timeline |
|----------|------------|---------------------|
| **CRITICAL** | Active security vulnerability; privilege escalation possible; data exposure risk | Immediate. No other work proceeds until resolved. |
| **HIGH** | Authorization gap exists but exploitation requires specific conditions; non-canonical pattern in production | Within current sprint or 5 business days, whichever is shorter. |
| **MEDIUM** | Non-optimal authorization pattern; does not create immediate risk but violates invariant | Planned remediation within 2 sprints. |

Each forbidden pattern (§8) carries its own severity. Invariant violations (§3) default to HIGH unless the specific invariant specifies otherwise.

### 9.2 No Exceptions Without CTO Sign-Off

No exception, waiver, temporary bypass, or deviation from any invariant or forbidden pattern in this document is permitted without:

1. A written exception request documenting: the invariant or pattern affected, the business justification, the risk assessment, the proposed mitigation, and the expiration date.
2. Explicit CTO approval recorded as an amendment to this document or as a standalone exception record referenced from this document.
3. A follow-up remediation plan with a binding deadline to restore compliance.

Verbal approvals are not exceptions. Undocumented exceptions do not exist.

### 9.3 Amendment Process

Amendments to this document require:

1. Documented justification demonstrating why the invariant or rule must change.
2. Verification that the proposed change does not contradict DOC-006, DOC-013, or DOC-014.
3. CTO or Product Owner approval with signature and timestamp.
4. Version increment of this document.
5. Notification to all active development collaborators (human and AI).

### 9.4 Relationship to Implementation Plans

This document is a constitution, not an implementation plan. It defines **what must be true**, not **how to make it true**.

Implementation plans, remediation plans, and code changes MUST cite the specific invariants, scope rules, and forbidden patterns they address. A plan that contradicts any provision of this document is rejected by definition and MUST NOT be implemented.

---

## 10. Compliance Checklist

The following checklist is designed for rapid verification. It applies to every new route, every modified route, every new module, and every authorization-related code review.

### 10.1 Per-Route Checklist

- [ ] **CC-001**: Does this route have a server-side authorization check before any data access or mutation? (INV-004)
- [ ] **CC-002**: Does the authorization check verify the specific operation (READ/CREATE/UPDATE/DELETE), not a blanket access check? (INV-002, §6.1)
- [ ] **CC-003**: Does the authorization check verify scope against the target entity? (§4.2)
- [ ] **CC-004**: For write routes: is there an explicit write grant check, independent of any read check? (INV-001)
- [ ] **CC-005**: Does the route derive authorization context server-side, not from client-provided values? (INV-006, FP-001)
- [ ] **CC-006**: Does the route use the target authorization engine, not a legacy or parallel engine? (INV-009, FP-002)

### 10.2 Per-Module Checklist

- [ ] **CC-007**: Is the module listed in DOC-013 §6.1? If not, has it been added through the canonical amendment process?
- [ ] **CC-008**: Are permission grants for this module recorded in the database with correct scope? (INV-010)
- [ ] **CC-009**: Does the Agent correctly filter this module based on user READ permissions? (§5)

### 10.3 Per-Release Checklist

- [ ] **CC-010**: Do database role names and count match DOC-014 §2 exactly? (INV-011)
- [ ] **CC-011**: Are there any routes using hardcoded role arrays? (FP-003)
- [ ] **CC-012**: Are there any routes without authorization checks? (INV-004)
- [ ] **CC-013**: Is the effective permissions display accurate against database state? (§7.2)
- [ ] **CC-014**: Are all authorization failures logged per §7.1?
- [ ] **CC-015**: Does any code reference Visibility Grants or equivalent mechanisms? (Visibility Grants are an explicitly rejected RBAC pattern in v2; any reference is non-canonical — FP-006)

---

## 11. Relationship to Canonical Baseline

### 11.1 Foundation Documents

This document is governed by and extends:

- **DOC-006** (Authorization Model & RBAC Specification): Defines the authorization model, enforcement rules, and anti-patterns.
- **DOC-013** (RBAC Authorization Matrix & Operational Policy v2.0): Defines roles, scopes, modules, permissions, and governance rules.
- **DOC-014** (RBAC Authorization Matrix v2.0): Renders the exhaustive permission matrix.
- **DOC-008** (Observability & Audit Trail Policy): Defines logging and audit requirements.
- **DOC-005** (Security, Privacy & Data Handling Constitution): Defines security principles including least privilege and defense in depth.

### 11.2 Conformance

This document conforms to:

- **DOC-001**: System Identity (Agent read-only constraint, internal-only system).
- **DOC-002**: Authority, Trust & Decision Boundaries.
- **DOC-003**: Architecture Constitution (server-side authority).
- **DOC-004**: Engineering Standards & Code Philosophy (no opportunistic refactors).

---

## 12. Closing Statement

Authorization is not a feature to be implemented. It is a property to be preserved.

Every route is an enforcement point. Every query is a scope boundary. Every session carries a permission set that is the complete and sole authority for what the user may do.

There are no shortcuts. There are no temporary exceptions. There is no "fix it later."

Any deviation from this constitution is a defect. Any defect is a risk. Any risk that is known and unaddressed is a decision — and that decision is recorded.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v1.0 | 2026-02-02 13:33:22 | Claude (acting CTO) | Initial canonical version. Codifies authorization invariants, scope enforcement rules, Agent constitution, admin authorization mapping, forbidden patterns, and compliance checklist. Issued in response to CTO-RESPONSE-RBAC-001 (remediation plan rejection). |
| v1.1 | 2026-02-02 13:46:14 | Claude (acting CTO) | CTO sign-off revision. All section-number citations verified against canonical sources. Visibility Grant language aligned to canonical wording (explicitly rejected pattern). INV-007 strengthened with enforcement clause. ASSIGNED scope clarified as generic invariant with current project-based canonical examples. Admin §6 governance sentence added. |
| v2.0 | 2026-02-02 14:00:26 | Claude (acting CTO) | **Canonical reset.** Re-issued from verified authoritative sources with correct UTF-8 Hebrew encoding (DOC-013 SHA256: 5a5e7298, DOC-014 SHA256: 834a0c86). Substance identical to v1.1. Canonical byte-level integrity restored. All prior versions derived from encoding-corrupted copies are superseded. |

---

End of Document
