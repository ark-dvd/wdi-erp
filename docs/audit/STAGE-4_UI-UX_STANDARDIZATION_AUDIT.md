# STAGE 4 — UI/UX Interaction Contract Standardization

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Audit Criteria Definition (Phase 4.0)

---

## 1. Purpose of Stage 4

### 1.1 Why Interaction Contracts Matter

An interaction contract is an implicit agreement between the system and the user: given an action, the system responds in a predictable, consistent manner. When contracts vary across modules, users must relearn behavior for each context, increasing cognitive load and error rates.

Stage 4 audits whether the WDI-ERP system enforces uniform interaction contracts across all operational modules. This ensures:

- Users can transfer learned behavior from one module to another
- Error states are handled identically regardless of context
- Destructive actions carry consistent safeguards
- Feedback mechanisms are reliable and unambiguous

### 1.2 Why This Is Not Visual Polish

This stage does not audit:

- Colors, typography, or spacing
- Icon aesthetics or visual hierarchy
- Animation or transition effects
- Brand consistency or design language

This stage audits:

- Behavioral consistency of interactive elements
- Predictability of system responses
- Uniformity of state transitions
- Reliability of user feedback mechanisms

Visual polish is subjective. Interaction contracts are enforceable.

---

## 2. Audit Principles

### 2.1 Determinism

Given identical user input and system state, the UI must produce identical behavior. No module may introduce randomness or context-dependent variation in core interaction patterns.

**Audit test:** For any interaction pattern P, executing P in module A and module B with equivalent entities must yield equivalent system responses.

### 2.2 Predictability

A user familiar with one module must be able to predict the behavior of equivalent interactions in any other module without prior exposure.

**Audit test:** Document interaction pattern once, verify identical behavior in all modules where that pattern applies.

### 2.3 Consistency Over Creativity

No module may deviate from established patterns for aesthetic or experiential reasons. Deviation is permitted only when:

- A different domain requirement is explicitly documented
- The deviation is approved and recorded in the codebase

**Audit test:** Any deviation from baseline pattern must have accompanying documentation justifying the deviation. Undocumented deviations are gaps.

### 2.4 User Trust and Error Prevention

The system must not:

- Execute destructive actions without confirmation
- Fail silently without user notification
- Present ambiguous states where the user cannot determine action outcome
- Allow form submission with known invalid data

**Audit test:** Simulate failure conditions and verify user receives appropriate feedback in all cases.

### 2.5 Behavioral Uniformity

Regardless of how an interaction pattern is implemented, its observable behavior must be identical across all modules. The audit does not prescribe implementation architecture; it verifies behavioral outcomes.

**Audit test:** For each interaction pattern, verify that user-observable behavior is identical across all module instances, regardless of underlying implementation.

---

## 3. Interaction Contract Domains

### 3.1 Tables

#### 3.1.1 Sorting Rules

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| T-SORT-01 | Sortable columns | Must be visually indicated (presence required, style not audited) |
| T-SORT-02 | Sort direction toggle | Clicking a sorted column must toggle ascending/descending |
| T-SORT-03 | Multi-column sort | Either supported everywhere or nowhere; no module-specific behavior |
| T-SORT-04 | Sort persistence | Sort state must persist during session or reset predictably on navigation |
| T-SORT-05 | Sort indicator | Current sort column and direction must be visible |

#### 3.1.2 Default Order

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| T-DEF-01 | Default sort column | Must be defined per table type and consistent across modules for same entity |
| T-DEF-02 | Default sort direction | Must follow convention: dates descending, text ascending, numbers descending |
| T-DEF-03 | Documentation | Default sort must be determinable from code or configuration |
| T-DEF-04 | Initial load | Table must display in defined default order on first render |

##### 3.1.2.1 Normative Default Sort Conventions

The following defaults are normative. Any deviation must be documented; undocumented deviations are gaps.

| Data Type | Default Sort Direction | Rationale |
|-----------|------------------------|-----------|
| Timestamps (dates, times) | Newest first (descending) | Users typically seek recent activity |
| Names/Labels (strings) | A → Z (ascending) | Alphabetical order is universally expected |
| Status values | Explicitly defined order | Status sort order must be documented in code/config |
| Money/Amount (currency, counts) | Highest first (descending) | Prioritizes significant values |
| IDs (identifiers) | Stable lexicographic | Must be deterministic; implementation defines order |

**Audit requirement:** For each table, verify the default sort matches these conventions or has documented justification for deviation.

#### 3.1.3 Pagination

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| T-PAGE-01 | Pagination threshold | Tables exceeding defined row threshold must paginate or virtualize |
| T-PAGE-02 | Page size options | If configurable, options must be identical across modules |
| T-PAGE-03 | Current page indicator | User must know current position in dataset |
| T-PAGE-04 | Navigation controls | First/prev/next/last behavior must be uniform |
| T-PAGE-05 | Total count | Total record count must be displayed |
| T-PAGE-06 | Page size persistence | Selected page size must persist during session |

#### 3.1.4 Empty States

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| T-EMPTY-01 | Empty indication | Tables with zero rows must display explicit empty state |
| T-EMPTY-02 | Empty message | Message must indicate emptiness, not malfunction |
| T-EMPTY-03 | Distinction from loading | Empty state must be visually distinct from loading state |
| T-EMPTY-04 | Distinction from error | Empty state must be visually distinct from error state |

#### 3.1.5 Loading States

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| T-LOAD-01 | Loading indication | Data fetch must show loading state |
| T-LOAD-02 | Interaction blocking | User must not be able to interact with stale/partial data during load |
| T-LOAD-03 | Error recovery | Failed load must display error state with retry option or clear message |
| T-LOAD-04 | Loading placement | Loading indicator must appear in consistent location |

#### 3.1.6 Selection

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| T-SEL-01 | Selection mechanism | If row selection exists, mechanism must be consistent (checkbox, row click, etc.) |
| T-SEL-02 | Select all | If bulk selection exists, select-all behavior must be uniform |
| T-SEL-03 | Selection persistence | Selection must persist or clear predictably during pagination |

---

### 3.2 Row Actions

#### 3.2.1 Placement

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-POS-01 | Action column position | Must be consistent (first or last column) across all tables |
| R-POS-02 | Action visibility | Actions must be visible without hover, or hover-reveal must be universal |
| R-POS-03 | Action grouping | If actions are grouped (dropdown/menu), grouping pattern must be consistent |

#### 3.2.2 Order

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-ORD-01 | Action sequence | Actions must appear in consistent order across all tables |
| R-ORD-02 | Primary action | If one action is primary, primary designation must be consistent |
| R-ORD-03 | Destructive action position | Destructive actions must appear in consistent position (first or last) |

#### 3.2.3 Destructive Action Confirmation

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-DEL-01 | Delete confirmation | All delete actions must require confirmation before execution |
| R-DEL-02 | Confirmation content | Confirmation must identify the target entity by name or identifier |
| R-DEL-03 | Confirmation labels | Confirm/Cancel button labels must be consistent across all dialogs |
| R-DEL-04 | Confirmation button order | Button order must be consistent across all confirmation dialogs |
| R-DEL-05 | No silent deletes | Delete must never execute without explicit user confirmation |
| R-DEL-06 | Cancel safety | Cancel/close must never execute the destructive action |

---

### 3.3 Forms

#### 3.3.1 Required Fields

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| F-REQ-01 | Required indication | Required fields must be visually indicated before submission attempt |
| F-REQ-02 | Indication method | Indication method must be consistent across all forms |
| F-REQ-03 | Indication timing | Required indication must be visible on form load, not only after error |

#### 3.3.2 Validation Timing

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| F-VAL-01 | Validation trigger | Must be consistent: on blur, on change, or on submit |
| F-VAL-02 | Inline validation | If used, must be used universally or not at all |
| F-VAL-03 | Async validation | Must show pending state during async validation |
| F-VAL-04 | Validation on submit | Final validation must occur before API call |

#### 3.3.3 Error Presentation

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| F-ERR-01 | Error location | Errors must appear in consistent location (inline, summary, or both) |
| F-ERR-02 | Error format | Error messages must follow consistent grammatical structure |
| F-ERR-03 | Error clearing | Errors must clear when field is corrected, not only on resubmit |
| F-ERR-04 | Field association | Errors must be visually associated with the relevant field |
| F-ERR-05 | Error focus | On submit with errors, focus must move to first error field |
| F-ERR-06 | Server error display | Server-returned errors must be displayed to user |

#### 3.3.4 Save/Cancel Behavior

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| F-BTN-01 | Button placement | Save and Cancel must appear in consistent positions relative to form |
| F-BTN-02 | Button order | Order (Save-Cancel or Cancel-Save) must be uniform across all forms |
| F-BTN-03 | Dirty state warning | Navigating away from unsaved changes must warn user |
| F-BTN-04 | Submit feedback | User must receive confirmation of successful save |
| F-BTN-05 | Submit disabled state | Submit button must be disabled during submission |
| F-BTN-06 | Cancel behavior | Cancel must discard changes and return to previous context |

#### 3.3.5 Form Layout

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| F-LAY-01 | Field grouping | Related fields must be grouped consistently across forms |
| F-LAY-02 | Label position | Labels must appear in consistent position (above, beside) |
| F-LAY-03 | Help text position | If help text exists, position must be consistent |

---

### 3.4 User Feedback

#### 3.4.1 Success Messages

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| U-SUC-01 | Success indication | Successful mutations must produce visible feedback |
| U-SUC-02 | Message content | Must confirm what action completed |
| U-SUC-03 | Message duration | Toast/notification duration must be consistent |
| U-SUC-04 | Message dismissal | Dismissal behavior (auto/manual) must be uniform |
| U-SUC-05 | Message position | Success messages must appear in consistent screen location |

#### 3.4.2 Error Messages

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| U-ERR-01 | Error indication | Failed operations must produce visible error feedback |
| U-ERR-02 | Error content | Must describe what failed |
| U-ERR-03 | Error cause | Must indicate why it failed if known |
| U-ERR-04 | Error actionability | Must indicate if user action can resolve the error |
| U-ERR-05 | No silent failures | Operations must never fail without user notification |
| U-ERR-06 | Error position | Error messages must appear in consistent screen location |
| U-ERR-07 | Error persistence | Error messages must persist until acknowledged or resolved |

#### 3.4.3 Authorization Denials

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| U-AUTH-01 | Denial indication | 403 responses must produce clear user feedback |
| U-AUTH-02 | Denial content | Must indicate lack of permission, not system error |
| U-AUTH-03 | UI prevention | Unauthorized actions should be hidden or disabled proactively |
| U-AUTH-04 | Denial consistency | Authorization denial message format must be consistent |

#### 3.4.4 Loading Feedback

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| U-LOAD-01 | Action pending | User must know when an action is in progress |
| U-LOAD-02 | Interaction prevention | User must not be able to duplicate pending actions |
| U-LOAD-03 | Loading indication | Loading indicator must be visible for operations exceeding threshold |

---

### 3.5 Navigation & Context

#### 3.5.1 Page Context Clarity

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| N-CTX-01 | Current location | User must know which module/section they are in |
| N-CTX-02 | Breadcrumb consistency | If breadcrumbs exist, structure must be uniform |
| N-CTX-03 | Page title | Must reflect current context and entity if applicable |
| N-CTX-04 | Browser title | Browser tab title must reflect current page |

#### 3.5.2 Module Consistency

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| N-MOD-01 | Layout structure | Core layout (header, sidebar, content) must be consistent |
| N-MOD-02 | Navigation patterns | Drill-down and return patterns must be uniform |
| N-MOD-03 | URL structure | URL patterns must be predictable across modules |
| N-MOD-04 | Back navigation | Back button/link behavior must be consistent |

#### 3.5.3 Modal/Dialog Behavior

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| N-DLG-01 | Modal escape | Escape key behavior must be consistent (close or no action) |
| N-DLG-02 | Backdrop click | Clicking outside modal must have consistent behavior |
| N-DLG-03 | Modal focus | Focus must be trapped within modal while open |
| N-DLG-04 | Modal close | Close button position must be consistent |

---

### 3.6 Journey Completion Signals

#### 3.6.1 Action Completion Clarity

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| J-CMP-01 | Completion signal | Every user action must have clear completion signal |
| J-CMP-02 | Return to context | After action, user must be returned to appropriate context |
| J-CMP-03 | State reflection | UI must reflect new state after action completes |
| J-CMP-04 | List update | After create/update/delete, list must reflect change |

#### 3.6.2 Ambiguous State Prevention

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| J-AMB-01 | No pending ambiguity | User must never be uncertain if action is pending or complete |
| J-AMB-02 | No outcome ambiguity | User must never be uncertain if action succeeded or failed |
| J-AMB-03 | Loading vs empty | Loading states must be distinguishable from empty states |
| J-AMB-04 | Saving vs saved | Saving state must be distinguishable from saved state |

#### 3.6.3 Workflow Continuity

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| J-WRK-01 | Multi-step clarity | In multi-step flows, current step must be indicated |
| J-WRK-02 | Progress persistence | Incomplete multi-step flows must preserve progress or warn on exit |
| J-WRK-03 | Completion indication | End of workflow must be clearly indicated |

---

## 4. Gap Classification Rules

### 4.1 Critical Gap

A gap is **Critical** when any of the following conditions exist:

| Condition | Definition |
|-----------|------------|
| Silent destructive action | A destructive action (delete, overwrite) executes without user confirmation |
| Silent failure | An operation fails with no user-visible feedback |
| Data loss risk | Inconsistent behavior can result in unintended data loss |
| Outcome ambiguity | User cannot determine if a completed action succeeded or failed |
| Double-submit risk | User can accidentally execute the same action multiple times |

**Response requirement:** Critical gaps must be addressed before Stage 4 completion.

### 4.2 Major Gap

A gap is **Major** when any of the following conditions exist:

| Condition | Definition |
|-----------|------------|
| Cross-module inconsistency | Equivalent actions behave differently across modules |
| Missing required indication | Required fields are not indicated before submission |
| Unhelpful error | Error message does not identify the problem |
| Auth as system error | Authorization denial (403) displays as system error |
| Interaction pattern divergence | Same pattern implemented differently in different modules |
| Missing feedback | Success or error feedback is absent but no data loss occurs |

**Response requirement:** Major gaps should be addressed before Stage 4 completion or documented with justification for deferral.

### 4.3 Minor Gap

A gap is **Minor** when any of the following conditions exist:

| Condition | Definition |
|-----------|------------|
| Order variation | Button or action order varies but functionality is correct |
| Wording variation | Message wording differs but meaning is unambiguous |
| Timing variation | Feedback timing varies but feedback exists |
| Indication variation | Indication method differs but indication exists |
| Position variation | Element position differs slightly but is findable |

**Response requirement:** Minor gaps should be documented. Remediation is optional for Stage 4 completion.

---

## 5. Audit Output Expectations

### 5.1 Gap Report Requirements

Each identified gap must include all of the following fields:

| Field | Description | Required |
|-------|-------------|----------|
| Gap ID | Unique identifier (format: UI-NNN) | Yes |
| Domain | Interaction contract domain (3.1–3.6) | Yes |
| Criterion ID | Specific criterion violated (e.g., T-SORT-01) | Yes |
| Classification | Critical / Major / Minor | Yes |
| Summary | One-sentence description of the gap | Yes |
| Location | File path(s) or component(s) affected | Yes |
| Modules Affected | List of operational modules exhibiting the gap | Yes |
| Evidence | Code reference or behavioral description | Yes |
| Baseline | Expected behavior per this document | Yes |
| Deviation | Observed behavior that differs from baseline | Yes |

### 5.2 Audit Evidence Standards

#### Valid Evidence

The following constitute valid audit evidence:

| Evidence Type | Description |
|---------------|-------------|
| Code inspection | Direct code showing divergent implementation patterns |
| Component comparison | Props/configuration differences for equivalent UI elements |
| Handler comparison | Event handler differences for equivalent user actions |
| State management comparison | State handling differences for equivalent flows |
| API response handling | Different handling of same API response patterns |

#### Invalid Evidence

The following do not constitute valid audit evidence:

| Evidence Type | Reason for Exclusion |
|---------------|----------------------|
| Screenshots | Subjective interpretation, not enforceable |
| User complaints | Anecdotal, not systematic |
| Performance metrics | Out of scope for interaction contracts |
| Accessibility findings | Separate audit domain |
| Visual design differences | Out of scope for Stage 4 |

### 5.3 Audit Methodology

The audit must follow this methodology:

1. **Inventory:** List all instances of each interaction pattern across modules
2. **Baseline:** Identify the most common implementation as baseline (or document absence of baseline)
3. **Comparison:** Compare each instance against baseline
4. **Classification:** Classify each deviation per Section 4
5. **Documentation:** Document each gap per Section 5.1

### 5.4 Out of Scope

The following are explicitly out of scope for Stage 4:

| Domain | Reason |
|--------|--------|
| Visual design consistency | Colors, fonts, spacing are aesthetic concerns |
| Accessibility compliance | WCAG, screen readers require separate audit |
| Performance optimization | Load times, bundle size are separate concerns |
| Mobile responsiveness | Requires separate audit methodology |
| Internationalization | Translation correctness is separate concern |
| Browser compatibility | Requires separate testing methodology |
| API design | Backend contracts are not UI/UX scope |
| Database schema | Data model is not UI/UX scope |

---

## Appendix A: Applicable Modules

Stage 4 audits apply to the following operational modules:

| Module | Primary Entities | Key Interactions |
|--------|------------------|------------------|
| Projects | Project, ProjectEvent, ContactProject | List, CRUD, sub-entity management |
| Contacts | Contact | List, CRUD, import |
| Organizations | Organization | List, CRUD, import |
| HR | Employee | List, CRUD (sensitive data) |
| Vehicles | Vehicle, FuelLog, Service, Accident, Toll, Parking, Ticket | List, CRUD, sub-entity CRUD |
| Equipment | Equipment | List, CRUD |
| Events | ProjectEvent, EventFile | List, CRUD, file management |
| Admin | DuplicateSet, ImportLog | Scan, merge, undo, import review |
| Individual Reviews | IndividualReview | List, CRUD |

---

## Appendix B: Audit Phases

Stage 4 proceeds in the following phases:

| Phase | Name | Deliverable |
|-------|------|-------------|
| 4.0 | Criteria Definition | This document |
| 4.1 | Pattern Inventory | Catalog of all interaction patterns per module |
| 4.2 | Gap Identification | Gap report per Section 5.1 format |
| 4.3 | Remediation | Implementation of fixes (if gaps found) |
| 4.4 | Re-Audit | Verification of remediation |

Phase 4.1 may not begin until Phase 4.0 is approved.

---

**End of Stage 4 Audit Criteria Document**
