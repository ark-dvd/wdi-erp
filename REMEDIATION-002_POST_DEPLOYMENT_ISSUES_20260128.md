# REMEDIATION-002: Post-RBAC Deployment Issues & UI Standardization
**Date:** 2026-01-28
**Status:** PENDING
**Predecessor:** REMEDIATION-001 (COMPLETED)

---

## EXECUTIVE SUMMARY

After RBAC v2 deployment and REMEDIATION-001 completion, multiple issues were discovered:
- 2 Critical regressions blocking production
- 4 Functional issues affecting user workflows
- Significant UI inconsistencies across module pages

---

## ISSUE REGISTRY

### PART A: CRITICAL REGRESSIONS (Production Blocking)

#### REM-002-A01: App crashes when adding contact from project contacts tab
- **Priority:** CRITICAL
- **Status:** PENDING
- **Root Cause:** `ProjectContactsTab.tsx` expects array from `/api/contacts` but gets MAYBACH paginated object `{items: [], pagination: {}}`
- **Files:**
  - `src/components/projects/ProjectContactsTab.tsx:56-57`
- **Current Code (BROKEN):**
  ```typescript
  const res = await fetch('/api/contacts')
  if (res.ok) setAllContacts(await res.json())
  ```
- **Fix:**
  ```typescript
  const res = await fetch('/api/contacts')
  if (res.ok) {
    const data = await res.json()
    setAllContacts(data.items || (Array.isArray(data) ? data : []))
  }
  ```
- **Verification:** Click "+ הוסף איש קשר" button in project contacts tab, modal should open with contact list

---

#### REM-002-A02: Profile photo not showing in sidebar
- **Priority:** CRITICAL
- **Status:** PENDING
- **Root Cause:** Phase 4 (REM-001-028) added authentication to `/api/file/route.ts`. Next.js `<Image>` component doesn't pass session cookies when loading images.
- **Files:**
  - `src/app/api/file/route.ts:14-17` (auth check added)
  - `src/components/Sidebar.tsx:128-135` (uses Image with employeePhoto)
  - `src/lib/auth.ts:161-163` (sets employeePhoto URL)
- **Options:**
  - **Option A (Recommended):** Create dedicated `/api/avatar/[userId]/route.ts` endpoint that validates internally
  - **Option B:** Generate signed URLs with time-limited access
  - **Option C:** Skip auth for specific file patterns (security concern)
- **Selected Fix:** Option A - Create avatar endpoint
- **Verification:** Login and verify profile photo appears in sidebar

---

### PART B: FUNCTIONAL ISSUES

#### REM-002-B01: Not all projects/buildings appear in vendor rating selection
- **Priority:** HIGH
- **Status:** PENDING
- **Root Cause:** Vendor page fetches projects but doesn't flatten hierarchy. Only top-level projects show, not quarters/buildings.
- **Files:**
  - `src/app/dashboard/vendors/page.tsx:85-97` (fetchProjects)
  - `src/app/dashboard/vendors/page.tsx:244-247` (filtering)
- **Current Behavior:** Shows only main projects
- **Expected Behavior:** Show all projects including quarters and buildings (hierarchically indented)
- **Fix:** Add `flatProjects` array like `events/page.tsx:124-137` does
- **Code Pattern:**
  ```typescript
  const flatProjects: { id: string; name: string; number: string; indent: number }[] = []
  projects.forEach(p => {
    flatProjects.push({ id: p.id, name: p.name, number: p.projectNumber, indent: 0 })
    if (p.children) {
      p.children.forEach((c: any) => {
        flatProjects.push({ id: c.id, name: c.name, number: c.projectNumber, indent: 1 })
        if (c.children) {
          c.children.forEach((b: any) => {
            flatProjects.push({ id: b.id, name: b.name, number: b.projectNumber, indent: 2 })
          })
        }
      })
    }
  })
  ```
- **Verification:** Open vendor rating, verify buildings appear in project dropdown

---

#### REM-002-B02: Missing "תכנון כוללני" in services list
- **Priority:** MEDIUM
- **Status:** PENDING
- **Root Cause:** SERVICES constant array is hardcoded and missing this service
- **Files:**
  - `src/app/dashboard/projects/new/page.tsx:59-69`
  - `src/app/dashboard/projects/[id]/edit/page.tsx:17-27`
- **Current Services (9):**
  ```
  ניהול תכנון, מסמכי דרישות/אפיון/פרוגרמה, ייצוג בעלי עניין,
  ניהול ביצוע ופיקוח, ניהול והבטחת איכות, שירותי PMO,
  ניהול תב"ע והיתרים, ניהול הידע בפרויקט, ניהול הצעה והגשה למכרז
  ```
- **Fix:** Add `'תכנון כוללני'` to SERVICES array in BOTH files
- **Recommended Refactor:** Extract to `src/lib/project-constants.ts` to avoid duplication
- **Verification:** Create/edit project, verify "תכנון כוללני" appears in services list

---

#### REM-002-B03: Events tab in project card - no edit/delete actions
- **Priority:** MEDIUM
- **Status:** PENDING
- **Root Cause:** Events tab renders event data without action buttons (unlike contacts tab which has them)
- **Files:**
  - `src/app/dashboard/projects/[id]/page.tsx:676-726` (events tab)
- **Comparison:** Contacts tab has `<Pencil>` and `<Trash2>` icons with handlers
- **Fix:**
  - Import `Pencil, Trash2` icons (already imported at line 16)
  - Add action buttons to each event row
  - Edit: navigate to `/dashboard/events/${event.id}`
  - Delete: call DELETE API with confirmation
- **Verification:** View project events tab, verify edit/delete buttons appear and work

---

#### REM-002-B04: External project rating option needed
- **Priority:** LOW
- **Status:** PENDING
- **Root Cause:** Schema requires `projectId` for IndividualReview - cannot rate for external work
- **Files:**
  - `prisma/schema.prisma:886-887` (`projectId String` - required)
  - `src/app/dashboard/vendors/page.tsx` (wizard)
  - `src/app/api/individual-reviews/route.ts` (validation)
- **Fix:**
  1. Schema: Change `projectId String` to `projectId String?`
  2. Add migration
  3. UI: Add "פרויקט חיצוני" option in project selection
  4. API: Update validation to allow null projectId
- **Verification:** Rate a vendor for external work (no project selected)

---

### PART C: UI STANDARDIZATION AUDIT

#### Current State Analysis

| Page | Sticky Header | Search Position | Filters | Summary Cards | Pagination | Server-Side |
|------|--------------|-----------------|---------|---------------|------------|-------------|
| Events | Yes (complex) | In filters row | Project, Type | No | Yes (50/page) | No |
| Projects | Yes | In filters row | State | No (inline counts) | Yes (50/page) | No |
| HR | No | Above table | Status | No | Yes (20/page) | Yes |
| Contacts | No | Above filters | Type, Discipline, Status | Tab counts only | Yes (20/page) | Yes |
| Equipment | No | Above table | Status, Type, Location | No | No | No |
| Vehicles | No | Above table | Status | Yes (4 cards) | No | No |
| Vendors | N/A (wizard) | In step UI | Search per step | No | No | No |

#### Identified Inconsistencies

##### REM-002-C01: Sticky Header Inconsistency
- **Current State:** Only Events and Projects have sticky headers
- **Standard:** All list pages should have sticky header with title + add button

##### REM-002-C02: Pagination Inconsistency
- **Current State:**
  - Events, Projects: 50 items/page, client-side
  - HR, Contacts: 20 items/page, server-side
  - Equipment, Vehicles: No pagination
- **Standard:** All pages with >50 potential items need pagination (server-side preferred)

##### REM-002-C03: Items Per Page Inconsistency
- **Current State:** 20 vs 50 items per page
- **Standard:** Consistent 20 items for server-side, 50 for client-side

##### REM-002-C04: Search Debounce Inconsistency
- **Current State:**
  - HR, Contacts: 300ms debounce
  - Others: No debounce
- **Standard:** 300ms debounce on all search inputs

##### REM-002-C05: Filter Layout Inconsistency
- **Current State:** Some have filters in row with search, some separate
- **Standard:** Filters row below header, search on the right

##### REM-002-C06: Summary Cards Inconsistency
- **Current State:** Only Vehicles has summary cards
- **Standard:** Summary cards optional but consistent positioning (below filters if present)

##### REM-002-C07: Status Badge Colors
- **Current State:** Mostly consistent but some variations
- **Standard Colors:**
  ```
  פעיל/ACTIVE: bg-green-100 text-green-800
  הושלם/COMPLETED: bg-gray-100 text-gray-800
  מושהה/PAUSED: bg-yellow-100 text-yellow-800
  בטיפול/IN_SERVICE: bg-yellow-100 text-yellow-800
  בוטל/CANCELLED: bg-red-100 text-red-800
  נמכר/SOLD: bg-red-100 text-red-800
  ```

##### REM-002-C08: Table Row Height Inconsistency
- **Current State:** Varies between pages
- **Standard:** `p-3` padding for all table rows

##### REM-002-C09: Sort Icon Inconsistency
- **Current State:** Most use `ChevronUp/ChevronDown`, some different
- **Standard:** `ChevronUp` for ascending, `ChevronDown` for descending

##### REM-002-C10: Loading State Inconsistency
- **Current State:** Various loading implementations
- **Standard:** Centered `<Loader2 className="animate-spin" />` with "טוען..." text

---

## STANDARDIZATION SPECIFICATION

### Standard Module Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│ STICKY HEADER                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Title (h1)                          [+ Add Button]      │ │
│ │ Subtitle/Count                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ FILTERS ROW (sticky with header if needed)                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Dropdown 1] [Dropdown 2] ... │ [🔍 Search Input     ]  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ SUMMARY CARDS (optional)                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│ │ Total  │ │ Active │ │ Paused │ │ Other  │                │
│ └────────┘ └────────┘ └────────┘ └────────┘                │
├─────────────────────────────────────────────────────────────┤
│ TABLE HEADER (sticky)                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Col1 ▲ │ Col2   │ Col3   │ ...        │ Actions        │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ TABLE BODY (scrollable)                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Row 1                                                   │ │
│ │ Row 2                                                   │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ PAGINATION                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │    [הקודם]  עמוד 1 מתוך 5  [הבא]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Standard Colors
```css
/* Primary */
--primary: #0a3161;
--primary-hover: #0a3161/90;
--primary-light: #0a3161/10;

/* Text */
--text-primary: #3a3a3d;
--text-secondary: #8f8f96;
--text-muted: #a7a7b0;

/* Backgrounds */
--bg-page: #f5f6f8;
--bg-card: #ffffff;
--bg-hover: #f5f6f8;

/* Borders */
--border: #e2e4e8;

/* Status Badges */
--status-active: bg-green-100 text-green-800;
--status-inactive: bg-gray-100 text-gray-800;
--status-warning: bg-yellow-100 text-yellow-800;
--status-error: bg-red-100 text-red-800;
```

### Standard Typography
```css
/* Page Title */
h1: text-2xl font-bold text-[#3a3a3d]

/* Subtitle/Count */
p: text-[#8f8f96] mt-1

/* Table Header */
th: text-sm font-medium text-[#3a3a3d]

/* Table Content */
td: text-sm text-[#3a3a3d]

/* Button Text */
button: text-sm font-medium
```

### Standard Spacing
```css
/* Page Padding */
page: p-6

/* Card Padding */
card: p-4

/* Table Row */
tr: p-3

/* Gap */
gap-standard: gap-4
gap-small: gap-2
```

---

## IMPLEMENTATION PHASES

### Phase 1: Critical Regressions (IMMEDIATE)
**Time Estimate:** 1-2 hours
**Risk:** LOW (isolated fixes)

| ID | Issue | File(s) |
|----|-------|---------|
| REM-002-A01 | Contact modal crash | ProjectContactsTab.tsx |
| REM-002-A02 | Profile photo missing | New api/avatar route |

**Verification Checklist:**
- [ ] Contact modal opens and shows contacts
- [ ] Profile photo displays in sidebar
- [ ] Existing functionality still works

---

### Phase 2: Functional Fixes (HIGH PRIORITY)
**Time Estimate:** 3-4 hours
**Risk:** MEDIUM (multiple files)

| ID | Issue | File(s) |
|----|-------|---------|
| REM-002-B01 | Vendor project dropdown | vendors/page.tsx |
| REM-002-B02 | Missing service | projects/new/page.tsx, projects/[id]/edit/page.tsx |
| REM-002-B03 | Events tab actions | projects/[id]/page.tsx |
| REM-002-B04 | External project rating | schema.prisma, vendors/page.tsx, API |

**Verification Checklist:**
- [ ] All buildings show in vendor rating
- [ ] "תכנון כוללני" appears in services
- [ ] Events have edit/delete buttons
- [ ] Can rate for external project (after schema change)

---

### Phase 3: UI Standardization (LOWER PRIORITY)
**Time Estimate:** 8-12 hours
**Risk:** MEDIUM-HIGH (many files, visual regression possible)

**Recommended Approach:**
1. Create shared components first (`StandardPageHeader`, `StandardFilters`, `StandardPagination`)
2. Apply to one page at a time
3. Visual regression testing after each page

| ID | Issue | Files Affected |
|----|-------|----------------|
| REM-002-C01 | Sticky headers | All 6 pages |
| REM-002-C02 | Pagination | Equipment, Vehicles |
| REM-002-C03 | Items per page | HR, Contacts (20→keep), Others (→50) |
| REM-002-C04 | Search debounce | Events, Projects, Equipment, Vehicles |
| REM-002-C05-C10 | Various UI | All pages |

**Recommendation:** Defer Phase 3 until after critical functionality is stable

---

## REGRESSION PREVENTION PROTOCOL

### Before ANY Change:
1. Document current behavior
2. List all related files that might be affected
3. Identify existing tests (if any)

### During Change:
1. Make minimal, focused changes
2. Test the specific fix
3. Test related functionality
4. Run `npm run build`

### After Change:
1. Verify fix works
2. Verify nothing else broke
3. Document what was changed
4. Commit with clear message

### High-Risk Changes (Require Extra Caution):
- API response format changes
- Schema changes
- Authentication/authorization changes
- Shared component changes

---

## APPENDIX: Files Changed in REMEDIATION-001

For reference, these files were modified in REMEDIATION-001:

**Phase 1 (RBAC Canonical):**
- `src/app/api/upload/route.ts`
- `src/app/api/organizations/route.ts`
- `src/app/api/organizations/[id]/route.ts`
- `src/app/api/organizations/import/route.ts`
- `prisma/seed.ts`
- `prisma/seed-safe.ts`

**Phase 2 (Format Fixes):**
- `src/app/dashboard/projects/new/page.tsx`
- `src/app/dashboard/projects/[id]/edit/page.tsx`
- `src/app/dashboard/vehicles/[id]/page.tsx`
- `src/app/dashboard/vehicles/new/page.tsx`
- `src/app/dashboard/equipment/new/page.tsx`
- `src/app/dashboard/equipment/[id]/edit/page.tsx`
- `src/app/m/events/page.tsx`
- `src/app/dashboard/events/new/page.tsx`
- `src/app/m/vehicles/page.tsx`

**Phase 3 (RBAC Coverage):**
- `src/app/api/events/route.ts`
- `src/app/api/individual-reviews/route.ts`
- `src/app/api/individual-reviews/[id]/route.ts`
- `src/app/api/contacts/[id]/reviews/route.ts`

**Phase 4 (Consolidation):**
- `src/app/api/vehicles/route.ts`
- `src/app/api/equipment/route.ts`
- `src/app/api/file/route.ts` (CAUSED REM-002-A02)
- `src/app/m/events/new/page.tsx`
- `src/app/m/events/page.tsx`

---

**Document Version:** 1.0
**Created By:** Claude Code
**Approval Required:** Yes, before Phase 1 execution
