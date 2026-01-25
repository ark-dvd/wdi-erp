# STAGE 4 — Phase 4.2: Gap Identification

**Date:** 2026-01-24
**Branch:** stage1-auth-policy-alignment
**Auditor:** Claude Code (READ-ONLY)

---

## 1. Methodology

Each pattern instance from Phase 4.1 was compared against applicable criteria in Stage 4.0. Gaps are recorded where observed behavior deviates from the normative requirement. Classification follows Section 4 of Stage 4.0.

---

## 2. Gap Register

### UI-001

| Field | Value |
|-------|-------|
| **Gap ID** | UI-001 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-SORT-01 |
| **Classification** | Major |
| **Summary** | Events list table lacks sortable column indicators |
| **Module / Screen** | Events |
| **Component name** | inline table |
| **File path(s)** | `src/app/dashboard/events/page.tsx` |
| **Baseline expectation** | Sortable columns must be visually indicated |
| **Observed behavior** | Events table renders inline without sort indicators; columns are not clickable for sorting |
| **Evidence** | PI-001 notes: "Inline table, no visible sort indicators" — no `handleSort` function or ChevronUp/ChevronDown icons present |

---

### UI-002

| Field | Value |
|-------|-------|
| **Gap ID** | UI-002 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-DEF-01 |
| **Classification** | Major |
| **Summary** | HR list table has no defined default sort column |
| **Module / Screen** | HR |
| **Component name** | SortableTable |
| **File path(s)** | `src/app/dashboard/hr/page.tsx` |
| **Baseline expectation** | Default sort column must be defined per table type |
| **Observed behavior** | No explicit default sort in code; data rendered in API return order |
| **Evidence** | PI-002: "No explicit default sort in code; data returned from API as-is" |

---

### UI-003

| Field | Value |
|-------|-------|
| **Gap ID** | UI-003 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-DEF-01 |
| **Classification** | Major |
| **Summary** | Contacts list table has no defined default sort column |
| **Module / Screen** | Contacts |
| **Component name** | SortableTable |
| **File path(s)** | `src/app/dashboard/contacts/page.tsx` |
| **Baseline expectation** | Default sort column must be defined per table type |
| **Observed behavior** | No explicit default sort; data rendered in API return order |
| **Evidence** | PI-002: "No explicit default sort; uses API order" |

---

### UI-004

| Field | Value |
|-------|-------|
| **Gap ID** | UI-004 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-DEF-01 |
| **Classification** | Major |
| **Summary** | Projects list table has no defined default sort column |
| **Module / Screen** | Projects |
| **Component name** | SortableTable |
| **File path(s)** | `src/app/dashboard/projects/page.tsx` |
| **Baseline expectation** | Default sort column must be defined per table type |
| **Observed behavior** | No explicit default sort; data rendered in API return order |
| **Evidence** | PI-002: "No explicit default sort; uses API order" |

---

### UI-005

| Field | Value |
|-------|-------|
| **Gap ID** | UI-005 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-DEF-01 |
| **Classification** | Major |
| **Summary** | Vehicles list table has no defined default sort column |
| **Module / Screen** | Vehicles |
| **Component name** | SortableTable |
| **File path(s)** | `src/app/dashboard/vehicles/page.tsx` |
| **Baseline expectation** | Default sort column must be defined per table type |
| **Observed behavior** | No explicit default sort; data rendered in API return order |
| **Evidence** | PI-002: "No explicit default sort; uses API order" |

---

### UI-006

| Field | Value |
|-------|-------|
| **Gap ID** | UI-006 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-PAGE-01 |
| **Classification** | Major |
| **Summary** | HR, Contacts, Projects, Vehicles, Equipment lists render full dataset without pagination |
| **Module / Screen** | HR, Contacts, Projects, Vehicles, Equipment |
| **Component name** | various list pages |
| **File path(s)** | `src/app/dashboard/hr/page.tsx`, `src/app/dashboard/contacts/page.tsx`, `src/app/dashboard/projects/page.tsx`, `src/app/dashboard/vehicles/page.tsx`, `src/app/dashboard/equipment/page.tsx` |
| **Baseline expectation** | Tables exceeding defined row threshold must paginate or virtualize |
| **Observed behavior** | Full list rendered without pagination; Events page uses ITEMS_PER_PAGE=50 but others do not |
| **Evidence** | PI-003: "No pagination; full list rendered" for HR, Contacts, Projects, Vehicles, Equipment |

---

### UI-007

| Field | Value |
|-------|-------|
| **Gap ID** | UI-007 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-PAGE-03 |
| **Classification** | Major |
| **Summary** | Events list pagination lacks current page indicator |
| **Module / Screen** | Events |
| **Component name** | inline pagination |
| **File path(s)** | `src/app/dashboard/events/page.tsx` |
| **Baseline expectation** | User must know current position in dataset |
| **Observed behavior** | Shows total count but no page number or navigation controls |
| **Evidence** | PI-003: "renders 50 items then shows total count" — no page indicator |

---

### UI-008

| Field | Value |
|-------|-------|
| **Gap ID** | UI-008 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-PAGE-04 |
| **Classification** | Major |
| **Summary** | Events list lacks standard pagination navigation controls |
| **Module / Screen** | Events |
| **Component name** | inline pagination |
| **File path(s)** | `src/app/dashboard/events/page.tsx` |
| **Baseline expectation** | First/prev/next/last behavior must be uniform |
| **Observed behavior** | No pagination navigation controls; renders fixed 50 items |
| **Evidence** | PI-003 notes ITEMS_PER_PAGE=50 but no navigation to other pages |

---

### UI-009

| Field | Value |
|-------|-------|
| **Gap ID** | UI-009 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-EMPTY-01 |
| **Classification** | Minor |
| **Summary** | Empty state presentation varies across modules |
| **Module / Screen** | HR, Contacts, Project Contacts Tab, Events, Contact Detail |
| **Component name** | various |
| **File path(s)** | `src/app/dashboard/hr/page.tsx`, `src/app/dashboard/contacts/page.tsx`, `src/components/projects/ProjectContactsTab.tsx:185-189`, `src/app/dashboard/contacts/[id]/page.tsx:233-238` |
| **Baseline expectation** | Empty indication must be consistent across modules |
| **Observed behavior** | HR/Contacts use text-only; Project Contacts Tab, Events, Contact Detail use icon+text in bordered container |
| **Evidence** | PI-005: "Text-only" for HR/Contacts vs "Icon + message in bordered container" for others |

---

### UI-010

| Field | Value |
|-------|-------|
| **Gap ID** | UI-010 |
| **Domain** | 3.1 Tables |
| **Criterion ID** | T-LOAD-03 |
| **Classification** | Major |
| **Summary** | No error state with retry option for failed table data loads |
| **Module / Screen** | All list pages |
| **Component name** | various |
| **File path(s)** | All list page files |
| **Baseline expectation** | Failed load must display error state with retry option or clear message |
| **Observed behavior** | Error caught in console.error; no user-visible error state with retry |
| **Evidence** | Code inspection shows `catch (error) { console.error(...) }` without setting error state |

---

### UI-011

| Field | Value |
|-------|-------|
| **Gap ID** | UI-011 |
| **Domain** | 3.2 Row Actions |
| **Criterion ID** | R-ORD-01 |
| **Classification** | Minor |
| **Summary** | Action button order reversed between list and detail views |
| **Module / Screen** | Contacts |
| **Component name** | inline actions |
| **File path(s)** | `src/app/dashboard/contacts/page.tsx`, `src/app/dashboard/contacts/[id]/page.tsx:147-148` |
| **Baseline expectation** | Actions must appear in consistent order across all tables |
| **Observed behavior** | List view: Edit, Delete order. Detail view: Delete button, then Edit link (reversed) |
| **Evidence** | PI-008: "Contacts List: Edit icon, then delete icon" vs "Contact Detail: Order: Trash2 (delete button), Edit link (reversed from table pattern)" |

---

### UI-012

| Field | Value |
|-------|-------|
| **Gap ID** | UI-012 |
| **Domain** | 3.2 Row Actions |
| **Criterion ID** | R-DEL-01 |
| **Classification** | Major |
| **Summary** | Delete confirmation uses native confirm() in some modules, custom modal in others |
| **Module / Screen** | Events, Contacts (list), Project Contacts Tab, Contact Detail |
| **Component name** | various |
| **File path(s)** | `src/app/dashboard/events/page.tsx`, `src/app/dashboard/contacts/page.tsx`, `src/components/projects/ProjectContactsTab.tsx:347-372`, `src/app/dashboard/contacts/[id]/page.tsx:308-318` |
| **Baseline expectation** | All delete actions must require confirmation before execution (consistent mechanism) |
| **Observed behavior** | Events and Contacts list use native browser `confirm()`; Project Contacts Tab and Contact Detail use custom modal dialogs |
| **Evidence** | PI-009, PI-010: "Events Page uses native confirm()" vs "Project Contacts Tab: Custom modal" |

---

### UI-013

| Field | Value |
|-------|-------|
| **Gap ID** | UI-013 |
| **Domain** | 3.3 Forms |
| **Criterion ID** | F-ERR-03 |
| **Classification** | Major |
| **Summary** | Form errors do not clear when field is corrected |
| **Module / Screen** | Contact Edit, Vehicle New, EmployeeForm |
| **Component name** | various forms |
| **File path(s)** | `src/app/dashboard/contacts/[id]/edit/page.tsx`, `src/app/dashboard/vehicles/new/page.tsx`, `src/components/EmployeeForm.tsx` |
| **Baseline expectation** | Errors must clear when field is corrected, not only on resubmit |
| **Observed behavior** | Error state is only cleared on successful form submission or manually before submit |
| **Evidence** | Code inspection: `setError('')` called only in handleSubmit, not on field change handlers |

---

### UI-014

| Field | Value |
|-------|-------|
| **Gap ID** | UI-014 |
| **Domain** | 3.3 Forms |
| **Criterion ID** | F-ERR-05 |
| **Classification** | Major |
| **Summary** | Focus does not move to first error field on form submission with errors |
| **Module / Screen** | All form pages |
| **Component name** | various forms |
| **File path(s)** | `src/app/dashboard/contacts/[id]/edit/page.tsx`, `src/app/dashboard/vehicles/new/page.tsx`, `src/components/EmployeeForm.tsx` |
| **Baseline expectation** | On submit with errors, focus must move to first error field |
| **Observed behavior** | Error message displayed at top of form; no focus management |
| **Evidence** | No `focus()` calls or focus management logic in form error handlers |

---

### UI-015

| Field | Value |
|-------|-------|
| **Gap ID** | UI-015 |
| **Domain** | 3.3 Forms |
| **Criterion ID** | F-BTN-03 |
| **Classification** | Critical |
| **Summary** | No dirty state warning when navigating away from unsaved form changes |
| **Module / Screen** | All form pages |
| **Component name** | all forms |
| **File path(s)** | `src/app/dashboard/contacts/[id]/edit/page.tsx`, `src/app/dashboard/vehicles/new/page.tsx`, `src/components/EmployeeForm.tsx`, `src/app/dashboard/contacts/new/page.tsx`, `src/app/dashboard/projects/new/page.tsx` |
| **Baseline expectation** | Navigating away from unsaved changes must warn user |
| **Observed behavior** | No `beforeunload` handlers or unsaved changes detection |
| **Evidence** | PI-025: "Not found. No beforeunload handlers or unsaved changes warnings observed." |

---

### UI-016

| Field | Value |
|-------|-------|
| **Gap ID** | UI-016 |
| **Domain** | 3.3 Forms |
| **Criterion ID** | F-BTN-04 |
| **Classification** | Major |
| **Summary** | No explicit success confirmation after form submission |
| **Module / Screen** | All form pages |
| **Component name** | all forms |
| **File path(s)** | All form pages |
| **Baseline expectation** | User must receive confirmation of successful save |
| **Observed behavior** | Success indicated only by navigation redirect; no explicit message |
| **Evidence** | PI-016, PI-024: "Not found. No toast library or success notification component. Success is signaled via router.push() navigation." |

---

### UI-017

| Field | Value |
|-------|-------|
| **Gap ID** | UI-017 |
| **Domain** | 3.4 User Feedback |
| **Criterion ID** | U-SUC-01 |
| **Classification** | Major |
| **Summary** | Successful mutations produce no visible feedback message |
| **Module / Screen** | All modules with mutations |
| **Component name** | all mutation handlers |
| **File path(s)** | All form and action handlers |
| **Baseline expectation** | Successful mutations must produce visible feedback |
| **Observed behavior** | No success toast or message; success inferred from navigation |
| **Evidence** | PI-016: "Not found. No toast library or success notification component." |

---

### UI-018

| Field | Value |
|-------|-------|
| **Gap ID** | UI-018 |
| **Domain** | 3.4 User Feedback |
| **Criterion ID** | U-ERR-06 |
| **Classification** | Major |
| **Summary** | Error messages appear in inconsistent locations (native alert vs inline div) |
| **Module / Screen** | Projects, Project Contacts Tab, Admin Duplicates, Contact Edit, Vehicle New |
| **Component name** | various |
| **File path(s)** | `src/app/dashboard/projects/[id]/page.tsx:94-97`, `src/components/projects/ProjectContactsTab.tsx:100,120,138`, `src/app/dashboard/admin/duplicates/[id]/page.tsx:124,128`, `src/app/dashboard/contacts/[id]/edit/page.tsx:139`, `src/app/dashboard/vehicles/new/page.tsx:39` |
| **Baseline expectation** | Error messages must appear in consistent screen location |
| **Observed behavior** | Some modules use native browser `alert()` (blocking popup); others use inline error div at form top |
| **Evidence** | PI-010: native alert() in Projects, Project Contacts Tab, Admin Duplicates vs PI-013: inline div in Contact Edit, Vehicle New |

---

### UI-019

| Field | Value |
|-------|-------|
| **Gap ID** | UI-019 |
| **Domain** | 3.4 User Feedback |
| **Criterion ID** | U-AUTH-01 |
| **Classification** | Major |
| **Summary** | Authorization denial (403) produces silent redirect with no user message |
| **Module / Screen** | Admin Duplicates, Admin Import |
| **Component name** | role check |
| **File path(s)** | `src/app/dashboard/admin/duplicates/[id]/page.tsx:55-59`, `src/app/dashboard/admin/import-contacts/page.tsx` |
| **Baseline expectation** | 403 responses must produce clear user feedback |
| **Observed behavior** | If role !== 'founder', user is silently redirected to /dashboard with no explanation |
| **Evidence** | PI-018: "If role !== 'founder', router.push('/dashboard')" — no message shown |

---

### UI-020

| Field | Value |
|-------|-------|
| **Gap ID** | UI-020 |
| **Domain** | 3.5 Navigation & Context |
| **Criterion ID** | N-CTX-02 |
| **Classification** | Major |
| **Summary** | Breadcrumbs exist only in Projects module; absent in all other detail pages |
| **Module / Screen** | HR, Contacts, Vehicles, Equipment, Events (detail pages) |
| **Component name** | — |
| **File path(s)** | `src/app/dashboard/hr/[id]/page.tsx`, `src/app/dashboard/contacts/[id]/page.tsx`, `src/app/dashboard/vehicles/[id]/page.tsx`, `src/app/dashboard/events/[id]/page.tsx` |
| **Baseline expectation** | If breadcrumbs exist, structure must be uniform across modules |
| **Observed behavior** | Projects detail page has getBreadcrumbs() function; all other detail pages have only back link |
| **Evidence** | PI-019: "Only Projects has breadcrumbs" vs "Not found. No breadcrumbs in HR, Contacts, Vehicles, Equipment, Events detail pages." |

---

### UI-021

| Field | Value |
|-------|-------|
| **Gap ID** | UI-021 |
| **Domain** | 3.5 Navigation & Context |
| **Criterion ID** | N-CTX-04 |
| **Classification** | Minor |
| **Summary** | Browser tab title does not reflect current page or entity |
| **Module / Screen** | All modules |
| **Component name** | — |
| **File path(s)** | All page files |
| **Baseline expectation** | Browser tab title must reflect current page |
| **Observed behavior** | No document.title manipulation or metadata export in page files |
| **Evidence** | PI-020: "Not found. No document.title manipulation or Head component usage observed." |

---

### UI-022

| Field | Value |
|-------|-------|
| **Gap ID** | UI-022 |
| **Domain** | 3.5 Navigation & Context |
| **Criterion ID** | N-DLG-01 |
| **Classification** | Minor |
| **Summary** | Modal dialogs have no Escape key handler |
| **Module / Screen** | Project Contacts Tab, Contact Detail |
| **Component name** | inline modals |
| **File path(s)** | `src/components/projects/ProjectContactsTab.tsx:231-372`, `src/app/dashboard/contacts/[id]/page.tsx:308-318` |
| **Baseline expectation** | Escape key behavior must be consistent (close or no action) |
| **Observed behavior** | No onKeyDown handler for Escape key; modal only closes via X button or Cancel button |
| **Evidence** | PI-022: "X button close only; no backdrop click handler" — no escape handler either |

---

### UI-023

| Field | Value |
|-------|-------|
| **Gap ID** | UI-023 |
| **Domain** | 3.5 Navigation & Context |
| **Criterion ID** | N-DLG-02 |
| **Classification** | Minor |
| **Summary** | Clicking modal backdrop does not close modal |
| **Module / Screen** | Project Contacts Tab, Contact Detail |
| **Component name** | inline modals |
| **File path(s)** | `src/components/projects/ProjectContactsTab.tsx:231-372`, `src/app/dashboard/contacts/[id]/page.tsx:308-318` |
| **Baseline expectation** | Clicking outside modal must have consistent behavior |
| **Observed behavior** | Backdrop div has no onClick handler; clicking backdrop does nothing |
| **Evidence** | PI-022: "no backdrop click handler" |

---

### UI-024

| Field | Value |
|-------|-------|
| **Gap ID** | UI-024 |
| **Domain** | 3.6 Journey Completion |
| **Criterion ID** | J-CMP-01 |
| **Classification** | Major |
| **Summary** | User actions have no explicit completion signal |
| **Module / Screen** | All mutation handlers |
| **Component name** | various |
| **File path(s)** | All form and action handlers |
| **Baseline expectation** | Every user action must have clear completion signal |
| **Observed behavior** | Success indicated only by page navigation; no explicit "saved" or "deleted" message |
| **Evidence** | PI-024: "Not found. No explicit 'saved successfully' message or toast. Success inferred from navigation." |

---

### UI-025

| Field | Value |
|-------|-------|
| **Gap ID** | UI-025 |
| **Domain** | 3.6 Journey Completion |
| **Criterion ID** | J-AMB-02 |
| **Classification** | Critical |
| **Summary** | User cannot distinguish if action succeeded or failed when navigation occurs |
| **Module / Screen** | All form submissions |
| **Component name** | various |
| **File path(s)** | All form pages |
| **Baseline expectation** | User must never be uncertain if action succeeded or failed |
| **Observed behavior** | On successful submit, user is navigated away. If navigation fails or is slow, user has no confirmation of success. No differentiation between "saved and navigated" vs "save failed silently" |
| **Evidence** | After router.push() in success handler, no fallback confirmation if navigation is delayed or fails |

---

## 3. Gap Summary

### By Severity

| Severity | Count | Gap IDs |
|----------|-------|---------|
| **Critical** | 2 | UI-015, UI-025 |
| **Major** | 18 | UI-001, UI-002, UI-003, UI-004, UI-005, UI-006, UI-007, UI-008, UI-010, UI-012, UI-013, UI-014, UI-016, UI-017, UI-018, UI-019, UI-020, UI-024 |
| **Minor** | 5 | UI-009, UI-011, UI-021, UI-022, UI-023 |
| **Total** | **25** | — |

### By Domain

| Domain | Count | Gap IDs |
|--------|-------|---------|
| 3.1 Tables | 10 | UI-001, UI-002, UI-003, UI-004, UI-005, UI-006, UI-007, UI-008, UI-009, UI-010 |
| 3.2 Row Actions | 2 | UI-011, UI-012 |
| 3.3 Forms | 4 | UI-013, UI-014, UI-015, UI-016 |
| 3.4 User Feedback | 3 | UI-017, UI-018, UI-019 |
| 3.5 Navigation & Context | 4 | UI-020, UI-021, UI-022, UI-023 |
| 3.6 Journey Completion | 2 | UI-024, UI-025 |

### Critical Gaps Requiring Immediate Attention

| Gap ID | Summary | Risk |
|--------|---------|------|
| UI-015 | No dirty state warning | Data loss risk — user can navigate away from unsaved changes |
| UI-025 | Outcome ambiguity after mutation | User cannot confirm action succeeded |

---

## 4. Conclusion

**Phase 4.2 Status:** COMPLETE

**Findings:**
- 25 gaps identified
- 2 Critical gaps requiring remediation before Stage 4 completion
- 18 Major gaps to be addressed or documented with justification
- 5 Minor gaps (optional remediation)

**Critical gaps block Stage 4 completion per Section 4.1 of Stage 4.0 criteria.**

---

**Ready for Phase 4.3 remediation.**

---

**Generated:** 2026-01-24
**Auditor:** Claude Code (READ-ONLY)
