---
Canonical Document ID: DOC-003
Document Title: Architecture Constitution
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 10:58:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 10:58:00 CST
Last Updated: 2026-01-23 10:58:00 CST
Current Version: v1.0
---

# DOC-003 — Architecture Constitution

---

## 1. Purpose

This document defines the architectural principles, constraints, and boundaries that govern the technical structure of the WDI ERP system.

Architecture is not a suggestion. It is the skeleton that determines what the system can and cannot become. Every technical decision must conform to this constitution. Deviations are defects.

---

## 2. Architectural Principles

### 2.1 Simplicity Over Cleverness

The system favors simple, understandable solutions over clever, complex ones. Code that requires extensive explanation to understand is a liability. Architecture that cannot be drawn on a whiteboard in five minutes is too complex.

Clever solutions create maintenance debt. Simple solutions create maintainable systems.

### 2.2 Explicit Over Implicit

All system behavior must be explicit and traceable. Hidden dependencies, implicit configurations, and magic conventions are forbidden.

If a behavior exists, it must be visible in the code. If a dependency exists, it must be declared. If a configuration affects behavior, it must be documented.

### 2.3 Boundaries Over Coupling

The system is organized into bounded contexts with explicit interfaces. Components communicate through defined contracts, not shared internals.

Tight coupling between components is a defect. A change in one component must not cascade unpredictably to others.

### 2.4 Consistency Over Local Optimization

Global consistency takes precedence over local optimization. A suboptimal solution that follows system patterns is preferred over an optimal solution that introduces inconsistency.

Every exception to a pattern weakens the pattern. Exceptions accumulate into chaos.

### 2.5 Observability Is Mandatory

Every component must be observable. If it cannot be monitored, measured, and debugged in production, it must not be deployed.

Observability is not an afterthought. It is a first-class architectural requirement.

---

## 3. System Architecture

### 3.1 High-Level Structure

The WDI ERP system follows a layered architecture with clear separation of concerns:

| Layer | Responsibility | Constraint |
|-------|---------------|------------|
| Presentation | User interface, API endpoints | No business logic |
| Application | Use cases, orchestration | No direct data access |
| Domain | Business rules, entities | No infrastructure dependencies |
| Infrastructure | Database, external services, file storage | No business logic |

Each layer may only depend on layers below it. Upward dependencies are forbidden. Circular dependencies are forbidden.

### 3.2 Technology Stack

The authoritative technology stack is:

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js | Ecosystem maturity, async performance |
| Framework | Next.js 14 | Full-stack capability, SSR support |
| Language | TypeScript | Type safety, maintainability |
| ORM | Prisma | Type-safe database access, migration management |
| Database | PostgreSQL (Cloud SQL) | Relational integrity, proven reliability |
| File Storage | Google Cloud Storage | Scalability, integration with GCP |
| Hosting | Google Cloud Run | Containerized deployment, auto-scaling |
| Authentication | Google OAuth | Domain-restricted SSO |

Technology changes require architectural authority approval and documented rationale.

### 3.3 Database Architecture

**PostgreSQL on Google Cloud SQL** is the sole relational data store.

Connection constraints:
- Cloud Run requires Cloud SQL Proxy sidecar for TCP connections
- Unix sockets are not supported with Prisma on Cloud Run
- Connection pooling is mandatory for production workloads

Schema constraints:
- All tables include standard audit fields (id, createdAt, createdBy, updatedAt, updatedBy, deletedAt)
- Foreign keys are explicit and enforced at the database level
- Cascading deletes are forbidden
- Indexes must be justified by query patterns

### 3.4 API Architecture

All APIs follow REST conventions with these constraints:

- JSON is the only serialization format
- All endpoints are versioned (e.g., /api/v1/...)
- Authentication is required for all endpoints except health checks
- Authorization is checked after authentication, before processing
- Error responses follow a consistent structure: { code, message, context }
- Pagination uses cursor-based patterns for large datasets

The AI agent consumes the same API surface as other clients but is restricted to read-only endpoints.

### 3.5 File Storage Architecture

Files are stored in Google Cloud Storage with these constraints:

- Files are never stored in the database
- File references in the database include: storage path, original filename, MIME type, size, upload timestamp, uploader identity
- Files are always associated with an operational entity; orphan files are forbidden
- File deletion follows soft-delete semantics; physical deletion requires explicit retention policy

### 3.6 Authentication Architecture

Authentication uses Google OAuth with domain restriction:

- Only users with @wdi.one or @wdiglobal.com email domains may authenticate
- Session management uses secure, HTTP-only cookies
- Token refresh is handled transparently
- Authentication state is verified on every request; client-side caching is for UX only

### 3.7 AI Agent Architecture

The AI agent is architecturally isolated:

- The agent has dedicated read-only query endpoints
- The agent cannot access mutation endpoints under any circumstance
- Agent requests carry user authorization context
- Agent responses are bounded by user permissions
- The agent reads from canonical views, never raw tables
- Agent errors do not expose internal system details

---

## 4. Deployment Architecture

### 4.1 Environments

Three environments exist with strict isolation:

| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Development, debugging | Synthetic or sanitized |
| Staging | Integration testing, pre-production validation | Synthetic or sanitized |
| Production | Live operations | Real operational data |

Data must never flow from production to non-production environments without explicit sanitization.

### 4.2 Deployment Pipeline

All deployments follow this sequence:
1. Code committed to GitHub
2. Pull to Cloud Workstation
3. Build Docker image via Cloud Build
4. Deploy to target environment via Cloud Run

Manual production changes are forbidden. All production changes flow through the pipeline.

### 4.3 Infrastructure as Code

All infrastructure configuration is version-controlled:

- Cloud Run service definitions in YAML
- Database migrations in Prisma
- Environment configuration in documented templates

Infrastructure that exists only in cloud console is a defect.

---

## 5. Scope Boundaries

### 5.1 In Scope

- Layered architecture definition
- Technology stack specification
- Database architecture constraints
- API design standards
- Deployment architecture
- Environment isolation requirements

### 5.2 Explicitly Out of Scope

- Specific API endpoint definitions (implementation concern)
- UI component architecture (frontend implementation concern)
- Business logic rules (domain concern)
- Operational procedures (operations concern)

### 5.3 Intentionally Excluded

The following architectural patterns are explicitly rejected:

- Microservices architecture (complexity exceeds benefit for current scale)
- Event sourcing (unnecessary complexity for operational data)
- GraphQL (REST meets current needs; consistency over novelty)
- Multi-database polyglot persistence (single database simplifies operations)
- Serverless functions for core business logic (Cloud Run provides sufficient abstraction)
- Client-side state management frameworks (server-rendered approach preferred)

---

## 6. Implications for Implementation

### 6.1 Backend

- All code must respect layer boundaries; cross-layer violations are defects
- Business logic must reside in the domain layer, not controllers or repositories
- Database queries must go through Prisma; raw SQL requires explicit justification
- All mutations must trigger audit logging
- Error handling must be consistent and produce structured error responses

### 6.2 Frontend

- Pages are server-rendered by default; client-side rendering requires justification
- API calls go through defined service layer, not directly from components
- UI state is minimal; server is the source of truth
- All layouts are RTL-first
- Loading and error states are mandatory for all async operations

### 6.3 Data

- Schema changes require migration scripts
- Migrations are append-only; destructive changes require explicit approval
- All queries must be optimized for expected data volumes
- Indexes must exist for all foreign keys and common query patterns

### 6.4 Infrastructure

- Docker images must be reproducible from source
- Environment variables are the only mechanism for environment-specific configuration
- Secrets are never in code or version control
- Health check endpoints must exist and accurately reflect service health
- Cloud SQL Proxy sidecar is mandatory for all Cloud Run services accessing the database

### 6.5 AI / Agent

- Agent implementation is isolated from main application code paths
- Agent queries use parameterized views, never dynamic SQL construction
- Agent response formatting is handled in the agent layer, not the data layer
- Agent must gracefully degrade when underlying services are unavailable

---

## 7. Explicit Anti-Patterns

The following patterns are forbidden. Code exhibiting these patterns must be corrected before deployment.

| Anti-Pattern | Violation |
|--------------|-----------|
| Business logic in API controllers | Violates layer separation |
| Direct database queries bypassing ORM | Violates data access pattern |
| Hardcoded configuration values | Violates explicit configuration principle |
| Circular dependencies between modules | Violates boundary principle |
| Shared mutable state between requests | Violates isolation principle |
| Raw SQL without explicit justification | Violates ORM-first principle |
| Deploying without health checks | Violates observability requirement |
| Environment-specific code paths (if production then...) | Violates consistency principle |
| Storing files in the database | Violates file storage architecture |
| Client-side business logic | Violates server-as-source-of-truth |
| Undocumented infrastructure in cloud console | Violates infrastructure-as-code |
| Skipping staging for "urgent" production deploys | Violates deployment pipeline |
| Agent endpoints that accept mutations | Violates agent read-only architecture |
| Cross-layer imports (controller importing repository directly) | Violates layer dependency rules |

---

## 8. Governance

This document governs all technical architecture decisions. Proposed deviations require:
- Documented rationale
- Architectural authority approval
- Amendment to this document if the deviation becomes permanent

Undocumented deviations are defects. Approved deviations that are not reflected in this document create governance drift and must be reconciled.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 10:58:00 CST | Claude (acting CTO) | Initial pre-canonical draft authored under the established governance standard |
| v1.0 | 2026-01-23 10:58:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
