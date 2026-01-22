# DOC-013 — Testing, QA & Release Discipline Constitution

Status: ACTIVE
Version: v1.0
Issued At: 2026-01-22.15-59 (CST)
Prepared by: Arik Davidi

---

## 1. Purpose (LOCKED)
Defines the non-negotiable discipline governing testing, quality assurance,
and release decisions.

Stability is a feature.

---

## 2. Testing Philosophy (LOCKED)
- Critical paths must be tested
- Business logic before UI polish
- Determinism over coverage vanity

---

## 3. Test Scope Definition (LOCKED)
Mandatory coverage:
- Data mutations
- Authorization rules
- Financial or contractual logic

---

## 4. Release Gates (LOCKED)
A release is blocked if:
- Tests are red
- Migrations are unsafe
- Observability is missing

---

## 5. Responsibility & Authority (LOCKED)
No anonymous releases.
Every deployment has an accountable owner.

---

End of Document
