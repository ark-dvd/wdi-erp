# STAGE 3 — Phase 3.1 Authorization Audit

## Summary

| Metric | Count |
|--------|-------|
| **Total mutation endpoints scanned** | 47 |
| **OK (role/ownership check)** | 10 |
| **GAP (auth-only)** | 37 |

**Result: FAIL**

---

## A) Endpoints with Authorization (OK)

| File | Method | Authorization Type | Roles/Logic |
|------|--------|-------------------|-------------|
| src/app/api/hr/[id]/route.ts | PUT | Role check | `SENSITIVE_DATA_ROLES` (founder, admin, hr_manager) |
| src/app/api/hr/[id]/route.ts | DELETE | Role check | `SENSITIVE_DATA_ROLES` |
| src/app/api/admin/import-contacts/save/route.ts | POST | Role check | founder, ceo, office_manager |
| src/app/api/admin/import-contacts/parse/route.ts | POST | Role check | founder only |
| src/app/api/admin/duplicates/[id]/route.ts | PUT | Role check | founder only |
| src/app/api/admin/duplicates/scan/route.ts | POST | Role check | founder only |
| src/app/api/admin/duplicates/[id]/merge/route.ts | POST | Role check | founder only |
| src/app/api/admin/duplicates/[id]/undo/route.ts | POST | Role check | founder only |
| src/app/api/individual-reviews/[id]/route.ts | PUT | Ownership | `review.reviewerId === session.user.id` |
| src/app/api/individual-reviews/[id]/route.ts | DELETE | Ownership | `review.reviewerId === session.user.id` |

---

## B) Endpoints Missing Authorization (GAP)

### Critical Priority (PII/Admin)

| File | Method | Notes |
|------|--------|-------|
| src/app/api/hr/route.ts | POST | Employee creation - handles PII |

### High Priority (Core Business Data)

| File | Method | Notes |
|------|--------|-------|
| src/app/api/contacts/route.ts | POST | Contact creation |
| src/app/api/contacts/[id]/route.ts | PUT | Contact update |
| src/app/api/contacts/[id]/route.ts | DELETE | Contact deletion |
| src/app/api/contacts/import/route.ts | POST | Bulk contact import |
| src/app/api/projects/route.ts | POST | Project creation |
| src/app/api/projects/[id]/route.ts | PUT | Project update |
| src/app/api/projects/[id]/route.ts | DELETE | Project deletion |
| src/app/api/projects/[id]/contacts/route.ts | POST | Contact-project linking |
| src/app/api/projects/[id]/events/route.ts | POST | Event creation |
| src/app/api/organizations/route.ts | POST | Organization creation |
| src/app/api/organizations/[id]/route.ts | PUT | Organization update |
| src/app/api/organizations/[id]/route.ts | DELETE | Organization deletion |
| src/app/api/organizations/import/route.ts | POST | Bulk org import |

### Medium Priority (Asset Management)

| File | Method | Notes |
|------|--------|-------|
| src/app/api/vehicles/route.ts | POST | Vehicle creation |
| src/app/api/vehicles/[id]/route.ts | PUT | Vehicle update |
| src/app/api/vehicles/[id]/route.ts | DELETE | Vehicle deletion |
| src/app/api/vehicles/[id]/assign/route.ts | POST | Vehicle assignment |
| src/app/api/vehicles/[id]/assign/route.ts | DELETE | Vehicle unassignment |
| src/app/api/vehicles/[id]/fuel/route.ts | POST | Fuel log creation |
| src/app/api/vehicles/[id]/fuel/route.ts | PUT | Fuel log update |
| src/app/api/vehicles/[id]/fuel/route.ts | DELETE | Fuel log deletion |
| src/app/api/vehicles/[id]/services/route.ts | POST/PUT/DELETE | Service records |
| src/app/api/vehicles/[id]/accidents/route.ts | POST/PUT/DELETE | Accident records |
| src/app/api/vehicles/[id]/tolls/route.ts | POST/PUT/DELETE | Toll records |
| src/app/api/vehicles/[id]/parking/route.ts | POST/PUT/DELETE | Parking records |
| src/app/api/vehicles/[id]/tickets/route.ts | POST/PUT/DELETE | Ticket records |
| src/app/api/equipment/route.ts | POST | Equipment creation |
| src/app/api/equipment/[id]/route.ts | PUT | Equipment update |
| src/app/api/equipment/[id]/route.ts | DELETE | Equipment deletion |

### Low Priority (User-Scoped/Utility)

| File | Method | Notes |
|------|--------|-------|
| src/app/api/individual-reviews/route.ts | POST | Review creation (user creates own) |
| src/app/api/events/[id]/route.ts | PUT | Event update |
| src/app/api/events/[id]/route.ts | DELETE | Event deletion |
| src/app/api/upload/route.ts | POST | File upload |

---

## C) Explicit Gap List

**37 mutation endpoints lack server-side authorization checks:**

1. `src/app/api/hr/route.ts` POST
2. `src/app/api/contacts/route.ts` POST
3. `src/app/api/contacts/[id]/route.ts` PUT
4. `src/app/api/contacts/[id]/route.ts` DELETE
5. `src/app/api/contacts/import/route.ts` POST
6. `src/app/api/projects/route.ts` POST
7. `src/app/api/projects/[id]/route.ts` PUT
8. `src/app/api/projects/[id]/route.ts` DELETE
9. `src/app/api/projects/[id]/contacts/route.ts` POST
10. `src/app/api/projects/[id]/events/route.ts` POST
11. `src/app/api/organizations/route.ts` POST
12. `src/app/api/organizations/[id]/route.ts` PUT
13. `src/app/api/organizations/[id]/route.ts` DELETE
14. `src/app/api/organizations/import/route.ts` POST
15. `src/app/api/vehicles/route.ts` POST
16. `src/app/api/vehicles/[id]/route.ts` PUT
17. `src/app/api/vehicles/[id]/route.ts` DELETE
18. `src/app/api/vehicles/[id]/assign/route.ts` POST
19. `src/app/api/vehicles/[id]/assign/route.ts` DELETE
20. `src/app/api/vehicles/[id]/fuel/route.ts` POST
21. `src/app/api/vehicles/[id]/fuel/route.ts` PUT
22. `src/app/api/vehicles/[id]/fuel/route.ts` DELETE
23. `src/app/api/vehicles/[id]/services/route.ts` POST/PUT/DELETE
24. `src/app/api/vehicles/[id]/accidents/route.ts` POST/PUT/DELETE
25. `src/app/api/vehicles/[id]/tolls/route.ts` POST/PUT/DELETE
26. `src/app/api/vehicles/[id]/parking/route.ts` POST/PUT/DELETE
27. `src/app/api/vehicles/[id]/tickets/route.ts` POST/PUT/DELETE
28. `src/app/api/equipment/route.ts` POST
29. `src/app/api/equipment/[id]/route.ts` PUT
30. `src/app/api/equipment/[id]/route.ts` DELETE
31. `src/app/api/individual-reviews/route.ts` POST
32. `src/app/api/events/[id]/route.ts` PUT
33. `src/app/api/events/[id]/route.ts` DELETE
34. `src/app/api/upload/route.ts` POST

---

## D) Conclusion

**Phase 3.1 Status: FAIL**

37 out of 47 mutation endpoints (79%) rely on authentication only, without role-based authorization. Per DOC-006 Authorization Model, every mutating endpoint must enforce explicit role checks.

### Remediation Required

All GAP endpoints need one of:
1. **Role check** — e.g., `if (!['founder', 'admin'].includes(userRole)) return 403`
2. **Ownership check** — e.g., `if (resource.ownerId !== userId) return 403`
3. **Project-scoped check** — e.g., user must be manager/lead of project

### Recommended Fix Order

1. **P0 (Critical)**: HR POST — handles employee PII
2. **P1 (High)**: contacts/*, projects/*, organizations/* — core business data
3. **P2 (Medium)**: vehicles/*, equipment/* — asset data
4. **P3 (Low)**: events/*, upload — lower sensitivity

---

## E) Audit Method

- Scanned all files matching `src/app/api/**/route.ts`
- For each POST/PUT/DELETE handler, checked for:
  - Role array check: `['founder', 'admin', ...].includes(userRole)`
  - SENSITIVE_DATA_ROLES pattern
  - Ownership comparison: `entity.ownerId === session.user.id`
- Classified as GAP if only `auth()` check present without subsequent role/ownership verification
