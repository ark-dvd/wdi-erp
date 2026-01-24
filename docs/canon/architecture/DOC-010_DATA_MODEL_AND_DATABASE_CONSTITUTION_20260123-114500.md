---
Canonical Document ID: DOC-010
Document Title: Data Model & Database Constitution
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 11:45:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 11:45:00 CST
Last Updated: 2026-01-23 11:45:00 CST
Current Version: v1.0
---

# DOC-010 — Data Model & Database Constitution

---

## 1. Purpose

This document defines the immutable principles governing the data model, database schema, and persistence layer of the WDI ERP system.

In an ERP system, data is the product. The user interface is a window into the data. The business logic is a transformation of the data. But the data itself is what the organization relies upon to operate.

Data model decisions are among the most consequential and difficult to reverse. This document establishes the constraints that protect data integrity over the system's lifetime.

---

## 2. Core Data Principles

### 2.1 Single Source of Truth

Every piece of business information has exactly one authoritative location in the system. Duplication for convenience creates synchronization problems and erodes trust.

If data exists in multiple places, one is authoritative and others are derived. The derivation relationship must be explicit and the synchronization mechanism must be defined.

### 2.2 Explicit Schema Over Implicit Structure

All data structures are explicitly defined in the schema. Implicit structures—JSON blobs with undocumented fields, convention-based relationships, magic values—are forbidden.

The schema is documentation. If the structure is not in the schema, it does not exist as a reliable contract.

### 2.3 Data Integrity Over Developer Convenience

Constraints that protect data integrity are enforced at the database level, not merely in application code. Application code can have bugs. Application code can be bypassed. Database constraints are always enforced.

Developer convenience is not a justification for weakening data integrity.

### 2.4 Forward-Only Evolution

The database schema evolves forward. Destructive changes—dropping columns, deleting data, removing constraints—require explicit justification and formal approval.

History is preserved by design. The ability to understand what the data looked like in the past is valuable.

---

## 3. Canonical Entity Rules

### 3.1 Primary Identifiers

Every entity has a stable primary identifier that:
- Is immutable after creation
- Has no business meaning (surrogate key)
- Is system-generated
- Is globally unique within the entity type

Primary identifiers must never be reused, even after deletion.

### 3.2 Soft Deletion

Soft deletion is mandatory for all business entities. Hard deletion is forbidden except for:
- Truly transient data (session state, temporary uploads)
- Explicit data retention policy enforcement
- Legal right-to-erasure requests with documented compliance requirement

Soft deletion implementation:
- `deletedAt` timestamp indicates deletion (null = active)
- Deleted records are excluded from normal queries by default
- Deleted records remain accessible for audit and recovery
- Deleted records count toward uniqueness constraints

### 3.3 Mandatory Audit Fields

All mutable tables must include the following audit fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID or equivalent | Primary identifier |
| createdAt | Timestamp with timezone | Record creation time |
| createdBy | Foreign key to users | User who created the record |
| updatedAt | Timestamp with timezone | Last modification time |
| updatedBy | Foreign key to users | User who last modified the record |
| deletedAt | Timestamp with timezone, nullable | Soft deletion timestamp |

These fields are non-negotiable. Tables without these fields are schema defects.

### 3.4 Timestamp Standards

All timestamps are stored in UTC. Display conversion to local timezone is a presentation concern.

Timestamp precision: Milliseconds minimum. Microseconds preferred where supported.

Timestamp fields must use timezone-aware types. Naive timestamps (without timezone information) are forbidden.

---

## 4. Relationships & Constraints

### 4.1 Explicit Foreign Keys

All relationships between entities are expressed through explicit foreign key constraints. Implicit relationships through naming conventions or application logic are forbidden.

Foreign keys must:
- Reference the primary key of the related table
- Have appropriate indexes for query performance
- Be documented with the relationship semantics

### 4.2 Cascading Deletes Are Forbidden

Cascading deletes are forbidden. When a parent entity is deleted (soft-deleted), child entities must be handled explicitly through application logic.

Rationale:
- Cascading deletes bypass audit logging
- Cascading deletes can cause unexpected data loss
- Cascading deletes make recovery difficult
- Explicit handling ensures business rules are applied

### 4.3 Referential Integrity

Referential integrity is enforced at the database level. The database must reject:
- Inserts that reference non-existent parent records
- Deletes that would orphan child records (unless soft-delete)
- Updates that break referential relationships

Application code may check referential integrity for user feedback, but the database is the enforcement authority.

### 4.4 Nullability

Nullability is an explicit design decision for each field. Fields are non-null by default unless null has defined semantic meaning.

Null means "unknown" or "not applicable." Null does not mean "empty string" or "zero" or "default value." If a field should never be absent, it must be non-nullable with a constraint.

---

## 5. Schema Design Standards

### 5.1 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `projects`, `event_logs` |
| Columns | snake_case | `created_at`, `project_id` |
| Primary keys | `id` | `id` |
| Foreign keys | `<entity>_id` | `project_id`, `user_id` |
| Indexes | `idx_<table>_<columns>` | `idx_projects_status_created` |
| Constraints | `<type>_<table>_<description>` | `fk_events_project_id`, `uq_users_email` |

Consistency in naming is mandatory. Deviations create confusion and errors.

### 5.2 Data Types

Use appropriate data types for the domain:
- UUIDs for identifiers (not auto-incrementing integers)
- Timestamps with timezone for all temporal data
- Decimal/Numeric for financial values (never floating point)
- Text for variable-length strings (with constraints where appropriate)
- Enums or lookup tables for constrained value sets

Stringly-typed data (storing structured data as plain strings) is forbidden.

### 5.3 Indexing Strategy

Indexes must exist for:
- All foreign key columns
- All columns used in WHERE clauses of common queries
- All columns used in ORDER BY clauses of common queries
- Composite indexes for common multi-column query patterns

Indexes must be justified by query patterns. Unused indexes waste resources.

### 5.4 Constraint Enforcement

Business rules that can be expressed as database constraints should be:
- NOT NULL for required fields
- UNIQUE for business keys
- CHECK constraints for value ranges or patterns
- Foreign keys for relationships

Database constraints are the last line of defense. Application validation is the first line.

---

## 6. Migrations Doctrine

### 6.1 Migrations Are Append-Only

Schema changes are expressed as migrations. Migrations are append-only:
- Each migration has a unique, sequential identifier
- Migrations are never modified after deployment to any shared environment
- New changes require new migrations

Modifying a deployed migration invalidates all environments and breaks reproducibility.

### 6.2 Backward Compatibility

Migrations must maintain backward compatibility during deployment windows:
- New columns must be nullable or have defaults
- Column removal must be preceded by application changes that stop using the column
- Constraint additions must be validated against existing data first

Zero-downtime deployment requires migrations that work with both old and new application versions.

### 6.3 Destructive Changes

Destructive changes require explicit approval and documentation:
- Dropping columns
- Dropping tables
- Removing constraints
- Truncating data

Destructive migrations must:
- Have documented justification
- Be reversible or have explicit data loss acceptance
- Be reviewed by data steward
- Be executed during maintenance windows with backup verification

### 6.4 Production Hotfixes Are Forbidden

Direct database modifications in production are forbidden. All changes flow through migrations.

There is no emergency severe enough to justify untracked schema changes. If changes are urgent, the migration pipeline is accelerated, not bypassed.

### 6.5 Migration Testing

All migrations must be tested:
- Against a copy of production schema
- With representative data volumes
- For both forward and rollback execution
- For performance impact on large tables

Migrations that pass on empty databases but fail on production data volumes are defective.

---

## 7. AI & Agent Data Access

### 7.1 Canonical Views

The AI agent reads from canonical views, not raw tables. Views provide:
- Abstraction from physical schema
- Consistent data representation
- Built-in filtering (e.g., excluding soft-deleted records)
- Security boundary for accessible data

Agent queries against raw tables are forbidden.

### 7.2 Derived Data Marking

Data derived or computed by the agent must be clearly marked as such. Users must be able to distinguish:
- Authoritative data from the database
- Computed or summarized data
- Inferred or suggested data

The agent must never present derived data as authoritative record.

### 7.3 Schema as Truth

The agent's understanding of data relies on schema truth. The schema is the contract:
- Field names and types define what data exists
- Constraints define what values are valid
- Relationships define how entities connect

Agent hallucination prevention depends on grounding responses in schema-defined reality.

---

## 8. Scope Boundaries

### 8.1 In Scope

- Data model principles
- Entity design standards
- Relationship and constraint requirements
- Schema naming and typing conventions
- Migration doctrine
- AI agent data access patterns

### 8.2 Explicitly Out of Scope

- Specific entity definitions (domain modeling concern)
- Query optimization techniques (operational concern)
- Backup and recovery procedures (operations concern)
- Database server configuration (infrastructure concern)

### 8.3 Intentionally Excluded

The following data modeling approaches are explicitly rejected:

- Schemaless or document-oriented storage for core business data
- Soft schema through JSON columns for structured business data
- Auto-incrementing integers for primary keys
- Cascading deletes for any relationship
- Hard deletion of business entities
- Timestamps without timezone information
- Floating-point types for financial data
- Direct agent access to raw tables

---

## 9. Implications for Implementation

### 9.1 Backend

- ORM entities must map to the canonical schema
- All mutations must update audit fields (updatedAt, updatedBy)
- All queries must respect soft-delete filters by default
- Bulk operations must maintain audit trail integrity
- Transaction boundaries must preserve referential integrity

### 9.2 Frontend

- Frontend must not assume database structure
- Frontend receives data through API contracts, not schema reflection
- Frontend must handle null values according to defined semantics
- Frontend must not cache data beyond defined freshness requirements

### 9.3 Data

- All tables follow the canonical entity rules
- All relationships have explicit foreign keys
- All migrations follow the migrations doctrine
- Schema documentation is maintained alongside schema definitions
- Data dictionary defines business meaning of all fields

### 9.4 Infrastructure

- Database backups occur before destructive migrations
- Point-in-time recovery capability is maintained
- Database performance monitoring tracks query patterns
- Connection pooling prevents resource exhaustion

### 9.5 AI / Agent

- Agent queries only canonical views
- Agent respects soft-delete semantics
- Agent queries include authorization context
- Agent never writes to the database
- Agent responses cite schema-grounded data

---

## 10. Explicit Anti-Patterns

The following patterns are forbidden. Implementations exhibiting these patterns are schema defects.

| Anti-Pattern | Violation |
|--------------|-----------|
| Tables without audit fields | Violates mandatory audit fields |
| Hard-deleting business records | Violates soft deletion requirement |
| Auto-increment integer primary keys | Violates identifier standards |
| Cascading delete constraints | Violates cascade prohibition |
| JSON columns for core business data | Violates explicit schema requirement |
| Timestamps without timezone | Violates timestamp standards |
| Float/double for money | Violates data type standards |
| Missing foreign key constraints | Violates explicit relationship requirement |
| Modifying deployed migrations | Violates append-only doctrine |
| Direct production schema changes | Violates migration pipeline |
| Agent querying raw tables | Violates canonical views requirement |
| Nullable fields without semantic justification | Violates nullability standards |
| Implicit relationships through naming | Violates explicit foreign keys |
| Tables without primary key | Violates entity identity |

---

## 11. Governance

This document defines the binding data model constitution. All schema designs and migrations must comply.

Schema changes require:
- Compliance with this constitution
- Documentation of business justification
- Review by appropriate technical authority
- Testing against representative data

Deviations require explicit exception approval with documented rationale and time-limited scope.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 11:45:00 CST | Claude (acting CTO) | Initial pre-canonical draft authored under the established governance standard |
| v1.0 | 2026-01-23 11:45:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
