# DOC-011 — Data Model & Database Constitution

Status: ACTIVE
Version: v1.0
Issued At: 2026-01-22.15-59 (CST)
Prepared by: Arik Davidi

---

## 1. Purpose (LOCKED)
This document defines the immutable principles governing the data model, database schema,
and persistence layer of the WDI ERP system.

In an ERP, data is the product.

---

## 2. Core Data Principles (LOCKED)
- Single source of truth
- Explicit schema over implicit structure
- Data integrity over developer convenience
- Forward-only evolution

---

## 3. Canonical Entity Rules (LOCKED)
- Every entity has a stable primary identifier
- Soft deletion is mandatory for business entities
- Audit fields are required on all mutable tables

Required fields:
- id
- createdAt
- createdBy
- updatedAt
- updatedBy
- deletedAt (nullable)

---

## 4. Relationships & Constraints (LOCKED)
- Foreign keys are explicit
- Cascading deletes are forbidden
- Referential integrity is enforced at the DB level

---

## 5. Migrations Doctrine (LOCKED)
- Migrations are append-only
- No destructive changes without explicit supersession
- Production hotfixes are forbidden

---

## 6. AI & Agent Data Access (LOCKED)
- Agents read canonical views, not raw tables
- Derived data is clearly marked
- Hallucination prevention relies on schema truth

---

End of Document
