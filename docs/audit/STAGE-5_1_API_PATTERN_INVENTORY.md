# STAGE 5 — Phase 5.1: API Pattern Inventory

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Inventory Complete

---

## 1. Scope & Method

### 1.1 API Areas Inspected

| Area | Path Pattern | Files Inspected |
|------|--------------|-----------------|
| Entity CRUD | `src/app/api/{entity}/route.ts`, `src/app/api/{entity}/[id]/route.ts` | contacts, projects, hr, organizations, vehicles, equipment, events, individual-reviews |
| Sub-resource CRUD | `src/app/api/{entity}/[id]/{sub-resource}/route.ts` | projects/contacts, projects/events, vehicles/fuel, vehicles/services, etc. |
| Admin Operations | `src/app/api/admin/**` | users, logs, duplicates, import-contacts |
| Import/Batch | `src/app/api/{entity}/import/route.ts`, `src/app/api/admin/import-contacts/**` | contacts/import, organizations/import, admin/import-contacts |
| File Operations | `src/app/api/upload/route.ts`, `src/app/api/file/route.ts` | upload, file proxy |
| Authentication | `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts` | NextAuth handlers |
| Activity Logging | `src/app/api/activity/route.ts` | activity log endpoint |

### 1.2 How Patterns Were Identified

1. File system scan of `src/app/api/**/*.ts` (51 route files identified)
2. Source code inspection of each route handler
3. Extraction of response shapes, error handling, and status codes
4. Cross-comparison to identify consistent vs. variant patterns

### 1.3 What Qualifies as a "Pattern Instance"

A pattern instance is a specific endpoint implementing a response or error handling pattern. Each HTTP method on each route file constitutes one instance.

---

## 2. Response Shape Patterns

### 2.1 Single-Entity Responses

#### Pattern API-PI-001: Direct Entity Return

**Description:** GET single entity returns the entity object directly at the root level, with optional computed fields appended.

| Endpoint | Method | File Path | Response Shape | Status Code |
|----------|--------|-----------|----------------|-------------|
| `/api/contacts/[id]` | GET | `src/app/api/contacts/[id]/route.ts:69-73` | `{ ...contact, reviewCount, averageRating }` | 200 |
| `/api/projects/[id]` | GET | `src/app/api/projects/[id]/route.ts:112-118` | `{ ...project, contacts, childrenContacts }` | 200 |
| `/api/hr/[id]` | GET | `src/app/api/hr/[id]/route.ts:71-84` | `{ ...safeEmployee, children, education, certifications, [conditionalSensitive] }` | 200 |
| `/api/organizations/[id]` | GET | `src/app/api/organizations/[id]/route.ts:65-68` | `{ ...organization, recentReviews }` | 200 |
| `/api/vehicles/[id]` | GET | `src/app/api/vehicles/[id]/route.ts:138` | `{ ...vehicle, stats }` | 200 |
| `/api/equipment/[id]` | GET | `src/app/api/equipment/[id]/route.ts:77` | `{ ...equipment }` | 200 |
| `/api/events/[id]` | GET | `src/app/api/events/[id]/route.ts:37` | `{ ...event }` | 200 |

**Observed Characteristics:**
- Entity fields spread directly into response
- Computed/aggregated fields appended (e.g., `reviewCount`, `stats`)
- Includes fields added inline (e.g., `recentReviews`)
- No envelope wrapper (no `{ data: ... }` pattern)

---

### 2.2 List Responses

#### Pattern API-PI-002: Direct Array Return

**Description:** GET list endpoints return an array directly, with no envelope or pagination metadata.

| Endpoint | Method | File Path | Response Shape | Status Code |
|----------|--------|-----------|----------------|-------------|
| `/api/contacts` | GET | `src/app/api/contacts/route.ts` | `[...contacts]` | 200 |
| `/api/projects` | GET | `src/app/api/projects/route.ts:153` | `[...projects]` | 200 |
| `/api/hr` | GET | `src/app/api/hr/route.ts:72` | `[...employees]` | 200 |
| `/api/organizations` | GET | `src/app/api/organizations/route.ts:35` | `[...organizations]` | 200 |
| `/api/vehicles` | GET | `src/app/api/vehicles/route.ts:60` | `[...vehicles]` | 200 |
| `/api/equipment` | GET | `src/app/api/equipment/route.ts:79` | `[...equipment]` | 200 |
| `/api/individual-reviews` | GET | `src/app/api/individual-reviews/route.ts:66` | `[...reviews]` | 200 |
| `/api/admin/users` | GET | `src/app/api/admin/users/route.ts:40` | `[...users]` | 200 |
| `/api/projects/[id]/contacts` | GET | `src/app/api/projects/[id]/contacts/route.ts:64` | `[...contactProjects]` | 200 |
| `/api/projects/[id]/events` | GET | `src/app/api/projects/[id]/events/route.ts:60` | `[...events]` | 200 |

**Observed Characteristics:**
- Returns raw array `[]`
- No pagination metadata
- No total count
- Empty results return `[]`

#### Pattern API-PI-003: Paginated Envelope Return

**Description:** GET list with pagination returns an object envelope containing array and pagination metadata.

| Endpoint | Method | File Path | Response Shape | Status Code |
|----------|--------|-----------|----------------|-------------|
| `/api/events` | GET | `src/app/api/events/route.ts:119-127` | `{ events: [...], pagination: { page, limit, total, pages } }` | 200 |

**Observed Characteristics:**
- Returns `{ events: [...], pagination: {...} }`
- Pagination object includes: `page`, `limit`, `total`, `pages`
- This pattern is unique to `/api/events` among inspected endpoints

---

### 2.3 Mutation Responses

#### Pattern API-PI-004: Create Returns Entity

**Description:** POST create operations return the created entity object.

| Endpoint | Method | File Path | Response Shape | Status Code |
|----------|--------|-----------|----------------|-------------|
| `/api/contacts` | POST | `src/app/api/contacts/route.ts` | `{ ...contact }` | 200 |
| `/api/projects` | POST | `src/app/api/projects/route.ts:342` | `{ ...project }` | 200 |
| `/api/hr` | POST | `src/app/api/hr/route.ts:172` | `{ ...employee }` | 200 |
| `/api/organizations` | POST | `src/app/api/organizations/route.ts:80` | `{ ...organization }` | 200 |
| `/api/vehicles` | POST | `src/app/api/vehicles/route.ts:134` | `{ ...vehicle }` | **201** |
| `/api/equipment` | POST | `src/app/api/equipment/route.ts:171` | `{ ...equipment }` | **201** |
| `/api/individual-reviews` | POST | `src/app/api/individual-reviews/route.ts:202` | `{ ...review }` | **201** |
| `/api/projects/[id]/contacts` | POST | `src/app/api/projects/[id]/contacts/route.ts:144` | `{ ...contactProject }` | 200 |
| `/api/projects/[id]/events` | POST | `src/app/api/projects/[id]/events/route.ts:139` | `{ ...event }` | **201** |

**Observed Characteristics:**
- Most endpoints return 200 for create
- vehicles, equipment, individual-reviews, projects/events return 201
- Created entity is returned with its assigned ID

#### Pattern API-PI-005: Update Returns Entity

**Description:** PUT update operations return the updated entity object.

| Endpoint | Method | File Path | Response Shape | Status Code |
|----------|--------|-----------|----------------|-------------|
| `/api/contacts/[id]` | PUT | `src/app/api/contacts/[id]/route.ts:128` | `{ ...contact }` | 200 |
| `/api/projects/[id]` | PUT | `src/app/api/projects/[id]/route.ts:209` | `{ ...project }` | 200 |
| `/api/hr/[id]` | PUT | `src/app/api/hr/[id]/route.ts:213` | `{ ...employee }` | 200 |
| `/api/organizations/[id]` | PUT | `src/app/api/organizations/[id]/route.ts:118` | `{ ...organization }` | 200 |
| `/api/vehicles/[id]` | PUT | `src/app/api/vehicles/[id]/route.ts:203` | `{ ...vehicle }` | 200 |
| `/api/equipment/[id]` | PUT | `src/app/api/equipment/[id]/route.ts:219` | `{ ...equipment }` | 200 |
| `/api/events/[id]` | PUT | `src/app/api/events/[id]/route.ts:84` | `{ ...event }` | 200 |

**Observed Characteristics:**
- Consistent 200 status code
- Returns updated entity with all fields

#### Pattern API-PI-006: Delete Returns Success Object

**Description:** DELETE operations return a simple success indicator object.

| Endpoint | Method | File Path | Response Shape | Status Code |
|----------|--------|-----------|----------------|-------------|
| `/api/contacts/[id]` | DELETE | `src/app/api/contacts/[id]/route.ts:166` | `{ success: true }` | 200 |
| `/api/projects/[id]` | DELETE | `src/app/api/projects/[id]/route.ts:271` | `{ success: true }` | 200 |
| `/api/hr/[id]` | DELETE | `src/app/api/hr/[id]/route.ts:267` | `{ success: true }` | 200 |
| `/api/organizations/[id]` | DELETE | `src/app/api/organizations/[id]/route.ts:156` | `{ success: true }` | 200 |
| `/api/vehicles/[id]` | DELETE | `src/app/api/vehicles/[id]/route.ts:254` | `{ success: true }` | 200 |
| `/api/equipment/[id]` | DELETE | `src/app/api/equipment/[id]/route.ts:264` | `{ success: true }` | 200 |
| `/api/events/[id]` | DELETE | `src/app/api/events/[id]/route.ts:132` | `{ success: true }` | 200 |

**Observed Characteristics:**
- Consistent `{ success: true }` response
- Consistent 200 status code (not 204)
- No deleted entity information returned

---

## 3. Error Response Patterns

### 3.1 Validation Errors

#### Pattern API-PI-007: Validation Error with Message

**Description:** Validation failures return 400 with `{ error: "message" }`.

| Endpoint | Method | File Path | Error Shape | Status Code |
|----------|--------|-----------|-------------|-------------|
| `/api/hr` | POST | `src/app/api/hr/route.ts:101-102` | `{ error: 'עובד עם תעודת זהות זו כבר קיים במערכת' }` | 400 |
| `/api/hr` | POST | `src/app/api/hr/route.ts:110-111` | `{ error: 'משתמש לא קיים במערכת...' }` | 400 |
| `/api/hr/[id]` | PUT | `src/app/api/hr/[id]/route.ts:158` | `{ error: 'תעודת זהות זו משויכת לעובד אחר' }` | 400 |
| `/api/vehicles` | POST | `src/app/api/vehicles/route.ts:87-88` | `{ error: 'מספר רישוי כבר קיים במערכת' }` | 400 |
| `/api/vehicles/[id]` | PUT | `src/app/api/vehicles/[id]/route.ts:169` | `{ error: 'מספר רישוי כבר קיים במערכת' }` | 400 |
| `/api/vehicles/[id]` | DELETE | `src/app/api/vehicles/[id]/route.ts:238-241` | `{ error: 'לא ניתן למחוק רכב שמשויך לעובד...' }` | 400 |
| `/api/equipment` | POST | `src/app/api/equipment/route.ts:109` | `{ error: 'מספר סריאלי כבר קיים במערכת' }` | 400 |
| `/api/equipment/[id]` | PUT | `src/app/api/equipment/[id]/route.ts:119` | `{ error: 'מספר סריאלי כבר קיים במערכת' }` | 400 |
| `/api/individual-reviews` | POST | `src/app/api/individual-reviews/route.ts:91-93` | `{ error: 'contactId and projectId are required' }` | 400 |
| `/api/individual-reviews` | POST | `src/app/api/individual-reviews/route.ts:106-108` | `{ error: 'כבר דירגת את איש הקשר הזה בפרויקט זה' }` | 400 |
| `/api/individual-reviews` | POST | `src/app/api/individual-reviews/route.ts:123-125` | `{ error: 'יש לדרג לפחות 6 קריטריונים...' }` | 400 |
| `/api/projects/[id]` | DELETE | `src/app/api/projects/[id]/route.ts:249-252` | `{ error: 'לא ניתן למחוק פרויקט עם תתי-פרויקטים...' }` | 400 |
| `/api/projects/[id]/contacts` | POST | `src/app/api/projects/[id]/contacts/route.ts:95` | `{ error: 'איש הקשר כבר משויך לפרויקט זה' }` | 400 |
| `/api/projects/[id]/events` | POST | `src/app/api/projects/[id]/events/route.ts:87` | `{ error: 'חסרים שדות חובה' }` | 400 |
| `/api/contacts/import` | POST | `src/app/api/contacts/import/route.ts:47` | `{ error: 'נדרש מערך של אנשי קשר' }` | 400 |
| `/api/upload` | POST | `src/app/api/upload/route.ts:38` | `{ error: 'No file provided' }` | 400 |
| `/api/upload` | POST | `src/app/api/upload/route.ts:44-47` | `{ error: 'קובץ גדול מדי...' }` | 400 |
| `/api/upload` | POST | `src/app/api/upload/route.ts:59-62` | `{ error: 'סוג קובץ לא נתמך...' }` | 400 |

**Observed Characteristics:**
- Consistent `{ error: string }` shape
- 400 status code for all validation errors
- Hebrew messages for user-facing errors
- English messages for technical errors (e.g., `'contactId and projectId are required'`)
- No field-level error details (no `{ errors: { field: message } }` pattern)

---

### 3.2 Authorization Errors (401 / 403)

#### Pattern API-PI-008: Unauthenticated Error (401)

**Description:** Missing or invalid session returns 401 with `{ error: 'Unauthorized' }`.

| File Path | Check Pattern | Error Shape | Status Code |
|-----------|---------------|-------------|-------------|
| `src/app/api/contacts/[id]/route.ts:22` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/projects/route.ts:84` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/hr/route.ts:21` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/organizations/route.ts:15` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/vehicles/route.ts:21` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/equipment/route.ts:22` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/events/route.ts:10` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/individual-reviews/route.ts:28` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/admin/users/route.ts:9` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/upload/route.ts:22` | `if (!session)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/activity/route.ts:10` | `if (!session?.user?.email)` | `{ error: 'Unauthorized' }` | 401 |
| `src/app/api/admin/import-contacts/parse/route.ts:227` | `if (!session?.user)` | `{ error: 'לא מורשה' }` | 401 |
| `src/app/api/admin/import-contacts/save/route.ts:12` | `if (!session?.user)` | `{ error: 'לא מורשה' }` | 401 |

**Observed Characteristics:**
- Consistent 401 status code
- Most use English `'Unauthorized'`
- Some admin routes use Hebrew `'לא מורשה'`

#### Pattern API-PI-009: Forbidden Error (403)

**Description:** Valid session but insufficient role returns 403 with `{ error: "message" }`.

| File Path | Role Check | Error Shape | Status Code |
|-----------|------------|-------------|-------------|
| `src/app/api/contacts/[id]/route.ts:93` | `CONTACTS_WRITE_ROLES` | `{ error: 'אין הרשאה לעדכן אנשי קשר' }` | 403 |
| `src/app/api/contacts/[id]/route.ts:148` | `CONTACTS_WRITE_ROLES` | `{ error: 'אין הרשאה למחוק אנשי קשר' }` | 403 |
| `src/app/api/projects/route.ts:171` | `PROJECTS_WRITE_ROLES` | `{ error: 'אין הרשאה ליצור פרויקטים' }` | 403 |
| `src/app/api/projects/[id]/route.ts:139` | `PROJECTS_WRITE_ROLES` | `{ error: 'אין הרשאה לעדכן פרויקטים' }` | 403 |
| `src/app/api/projects/[id]/route.ts:230` | `PROJECTS_WRITE_ROLES` | `{ error: 'אין הרשאה למחוק פרויקטים' }` | 403 |
| `src/app/api/hr/route.ts:90` | `SENSITIVE_DATA_ROLES` | `{ error: 'אין הרשאה ליצור עובדים' }` | 403 |
| `src/app/api/hr/[id]/route.ts:135` | `SENSITIVE_DATA_ROLES` | `{ error: 'אין הרשאה לעדכן נתוני עובדים' }` | 403 |
| `src/app/api/hr/[id]/route.ts:234` | `SENSITIVE_DATA_ROLES` | `{ error: 'אין הרשאה למחוק עובדים' }` | 403 |
| `src/app/api/organizations/route.ts:51` | `ORGS_WRITE_ROLES` | `{ error: 'אין הרשאה ליצור ארגונים' }` | 403 |
| `src/app/api/organizations/[id]/route.ts:88` | `ORGS_WRITE_ROLES` | `{ error: 'אין הרשאה לעדכן ארגונים' }` | 403 |
| `src/app/api/organizations/[id]/route.ts:138` | `ORGS_WRITE_ROLES` | `{ error: 'אין הרשאה למחוק ארגונים' }` | 403 |
| `src/app/api/vehicles/route.ts:77` | `VEHICLES_WRITE_ROLES` | `{ error: 'אין הרשאה ליצור רכבים' }` | 403 |
| `src/app/api/vehicles/[id]/route.ts:158` | `VEHICLES_WRITE_ROLES` | `{ error: 'אין הרשאה לעדכן רכבים' }` | 403 |
| `src/app/api/vehicles/[id]/route.ts:223` | `VEHICLES_WRITE_ROLES` | `{ error: 'אין הרשאה למחוק רכבים' }` | 403 |
| `src/app/api/equipment/route.ts:96` | `EQUIPMENT_WRITE_ROLES` | `{ error: 'אין הרשאה להוסיף ציוד' }` | 403 |
| `src/app/api/equipment/[id]/route.ts:97` | `EQUIPMENT_WRITE_ROLES` | `{ error: 'אין הרשאה לעדכן ציוד' }` | 403 |
| `src/app/api/equipment/[id]/route.ts:239` | `EQUIPMENT_WRITE_ROLES` | `{ error: 'אין הרשאה למחוק ציוד' }` | 403 |
| `src/app/api/events/[id]/route.ts:55` | `EVENTS_WRITE_ROLES` | `{ error: 'אין הרשאה לעדכן אירועים' }` | 403 |
| `src/app/api/events/[id]/route.ts:102` | `EVENTS_WRITE_ROLES` | `{ error: 'אין הרשאה למחוק אירועים' }` | 403 |
| `src/app/api/upload/route.ts:29` | `UPLOAD_ROLES` | `{ error: 'אין הרשאה להעלות קבצים' }` | 403 |
| `src/app/api/contacts/import/route.ts:39` | `CONTACTS_IMPORT_ROLES` | `{ error: 'אין הרשאה לייבוא אנשי קשר' }` | 403 |
| `src/app/api/admin/users/route.ts:14` | `userRole !== 'founder'` | `{ error: 'Forbidden' }` | 403 |
| `src/app/api/admin/import-contacts/parse/route.ts:233` | `userRole !== 'founder'` | `{ error: 'אין הרשאה' }` | 403 |
| `src/app/api/admin/import-contacts/save/route.ts:18` | `!['founder', 'ceo', 'office_manager'].includes` | `{ error: 'אין הרשאה לייבוא' }` | 403 |
| `src/app/api/projects/[id]/contacts/route.ts:84` | `PROJECTS_WRITE_ROLES` | `{ error: 'אין הרשאה לשייך אנשי קשר לפרויקט' }` | 403 |
| `src/app/api/projects/[id]/events/route.ts:82` | `PROJECTS_WRITE_ROLES` | `{ error: 'אין הרשאה ליצור אירועים' }` | 403 |

**Observed Characteristics:**
- Consistent 403 status code
- Hebrew messages for most endpoints (`אין הרשאה ל...`)
- English `'Forbidden'` for admin/users
- Role arrays defined per module at top of file

---

### 3.3 Not Found (404)

#### Pattern API-PI-010: Not Found Error

**Description:** Non-existent resource returns 404 with `{ error: "message" }`.

| Endpoint | Method | File Path | Error Shape | Status Code |
|----------|--------|-----------|-------------|-------------|
| `/api/contacts/[id]` | GET | `src/app/api/contacts/[id]/route.ts:56` | `{ error: 'איש קשר לא נמצא' }` | 404 |
| `/api/projects/[id]` | GET | `src/app/api/projects/[id]/route.ts:82` | `{ error: 'Project not found' }` | 404 |
| `/api/projects/[id]` | PUT | `src/app/api/projects/[id]/route.ts:152` | `{ error: 'Project not found' }` | 404 |
| `/api/projects/[id]` | DELETE | `src/app/api/projects/[id]/route.ts:241` | `{ error: 'Project not found' }` | 404 |
| `/api/projects` | POST | `src/app/api/projects/route.ts:186` | `{ error: 'פרויקט אב לא נמצא' }` | 404 |
| `/api/hr/[id]` | GET | `src/app/api/hr/[id]/route.ts:65` | `{ error: 'Employee not found' }` | 404 |
| `/api/hr/[id]` | PUT | `src/app/api/hr/[id]/route.ts:146` | `{ error: 'Employee not found' }` | 404 |
| `/api/hr/[id]` | DELETE | `src/app/api/hr/[id]/route.ts:245` | `{ error: 'Employee not found' }` | 404 |
| `/api/organizations/[id]` | GET | `src/app/api/organizations/[id]/route.ts:44` | `{ error: 'ארגון לא נמצא' }` | 404 |
| `/api/vehicles/[id]` | GET | `src/app/api/vehicles/[id]/route.ts:101` | `{ error: 'Vehicle not found' }` | 404 |
| `/api/equipment/[id]` | GET | `src/app/api/equipment/[id]/route.ts:74` | `{ error: 'Equipment not found' }` | 404 |
| `/api/equipment/[id]` | PUT | `src/app/api/equipment/[id]/route.ts:110` | `{ error: 'Equipment not found' }` | 404 |
| `/api/equipment/[id]` | DELETE | `src/app/api/equipment/[id]/route.ts:248` | `{ error: 'Equipment not found' }` | 404 |
| `/api/events/[id]` | GET | `src/app/api/events/[id]/route.ts:35` | `{ error: 'Event not found' }` | 404 |
| `/api/projects/[id]/contacts` | GET | `src/app/api/projects/[id]/contacts/route.ts:26` | `{ error: 'Project not found' }` | 404 |
| `/api/projects/[id]/events` | GET | `src/app/api/projects/[id]/events/route.ts:33` | `{ error: 'פרויקט לא נמצא' }` | 404 |
| `/api/individual-reviews` | POST | `src/app/api/individual-reviews/route.ts:85` | `{ error: 'User not found' }` | 404 |

**Observed Characteristics:**
- Consistent 404 status code
- Mixed Hebrew and English error messages
- Some use entity-specific messages, others generic

---

### 3.4 Conflict (409)

#### Pattern API-PI-011: Conflict Error

**Description:** Uniqueness constraint violations.

| Endpoint | Method | File Path | Error Shape | Status Code |
|----------|--------|-----------|-------------|-------------|
| Not found | - | - | - | - |

**Observed Characteristics:**
- **Not found**: No 409 Conflict responses observed
- Uniqueness violations return 400 instead (see API-PI-007)

---

### 3.5 Server Errors (5xx)

#### Pattern API-PI-012: Internal Server Error

**Description:** Unhandled exceptions return 500 with `{ error: "message" }`.

| Endpoint | Method | File Path | Error Shape | Status Code |
|----------|--------|-----------|-------------|-------------|
| `/api/contacts/[id]` | GET | `src/app/api/contacts/[id]/route.ts:76` | `{ error: 'Failed to fetch contact' }` | 500 |
| `/api/contacts/[id]` | PUT | `src/app/api/contacts/[id]/route.ts:131` | `{ error: 'Failed to update contact' }` | 500 |
| `/api/contacts/[id]` | DELETE | `src/app/api/contacts/[id]/route.ts:169` | `{ error: 'Failed to delete contact' }` | 500 |
| `/api/projects/route.ts` | GET | `src/app/api/projects/route.ts:156` | `{ error: 'Failed to fetch projects' }` | 500 |
| `/api/projects/route.ts` | POST | `src/app/api/projects/route.ts:345` | `{ error: 'Failed to create project' }` | 500 |
| `/api/hr/route.ts` | GET | `src/app/api/hr/route.ts:75` | `{ error: 'Failed to fetch employees' }` | 500 |
| `/api/individual-reviews` | GET | `src/app/api/individual-reviews/route.ts:69` | `{ error: 'Internal server error' }` | 500 |
| `/api/individual-reviews` | POST | `src/app/api/individual-reviews/route.ts:205` | `{ error: 'Internal server error' }` | 500 |
| `/api/events/route.ts` | GET | `src/app/api/events/route.ts:130` | `{ error: 'שגיאה בטעינת אירועים' }` | 500 |
| `/api/contacts/import` | POST | `src/app/api/contacts/import/route.ts:138` | `{ error: <dynamic message> }` | 500 |
| `/api/admin/import-contacts/parse` | POST | `src/app/api/admin/import-contacts/parse/route.ts:325-328` | `{ error: 'שגיאה בעיבוד הנתונים', details: ... }` | 500 |
| `/api/admin/import-contacts/save` | POST | `src/app/api/admin/import-contacts/save/route.ts:215-218` | `{ error: 'שגיאה בייבוא אנשי קשר' }` | 500 |

**Observed Characteristics:**
- Consistent 500 status code
- Generic English messages (`'Failed to...'`, `'Internal server error'`)
- Some Hebrew messages for user-facing endpoints
- No stack traces exposed
- console.error logs the actual error server-side

---

## 4. List / Query Behavior Patterns

### 4.1 Pagination Parameters

#### Pattern API-PI-013: Offset-Based Pagination

**Description:** Pagination via `page` and `limit` query parameters.

| Endpoint | File Path | Parameters | Default Behavior |
|----------|-----------|------------|------------------|
| `/api/events` | `src/app/api/events/route.ts:21-22` | `page` (default: 1), `limit` (default: 20) | Returns paginated subset with metadata |

**Observed Characteristics:**
- Only `/api/events` implements pagination
- All other list endpoints return full results
- No cursor-based pagination observed

### 4.2 Sorting Parameters

#### Pattern API-PI-014: Fixed Sort Order

**Description:** Sort order is hard-coded in endpoint, not configurable via query parameters.

| Endpoint | File Path | Sort Order |
|----------|-----------|------------|
| `/api/projects` | `src/app/api/projects/route.ts:150` | `orderBy: { projectNumber: 'asc' }` |
| `/api/hr` | `src/app/api/hr/route.ts:24` | `orderBy: { lastName: 'asc' }` |
| `/api/organizations` | `src/app/api/organizations/route.ts:33` | `orderBy: { name: 'asc' }` |
| `/api/vehicles` | `src/app/api/vehicles/route.ts:57` | `orderBy: { updatedAt: 'desc' }` |
| `/api/equipment` | `src/app/api/equipment/route.ts:76` | `orderBy: { updatedAt: 'desc' }` |
| `/api/events` | `src/app/api/events/route.ts:107` | `orderBy: { eventDate: 'desc' }` |
| `/api/individual-reviews` | `src/app/api/individual-reviews/route.ts:63` | `orderBy: { createdAt: 'desc' }` |
| `/api/admin/users` | `src/app/api/admin/users/route.ts:37` | `orderBy: { email: 'asc' }` |

**Observed Characteristics:**
- No sort parameter support observed
- Each endpoint has fixed default sort
- No client-configurable sorting

### 4.3 Filtering Parameters

#### Pattern API-PI-015: Query String Filters

**Description:** List endpoints support filtering via query string parameters.

| Endpoint | File Path | Filter Parameters |
|----------|-----------|-------------------|
| `/api/projects` | `src/app/api/projects/route.ts:87-95` | `state`, `category`, `level` |
| `/api/organizations` | `src/app/api/organizations/route.ts:17-26` | `search`, `type` |
| `/api/vehicles` | `src/app/api/vehicles/route.ts:25-31` | `status` |
| `/api/equipment` | `src/app/api/equipment/route.ts:26-47` | `status`, `type`, `assigneeId`, `isOffice` |
| `/api/events` | `src/app/api/events/route.ts:16-68` | `project`, `type`, `search`, `from`, `to` |
| `/api/individual-reviews` | `src/app/api/individual-reviews/route.ts:31-46` | `contactId`, `projectId`, `organizationId` |

**Observed Characteristics:**
- Different filter parameter names per endpoint
- No consistent filter prefix (e.g., no `filter[field]` pattern)
- Text search uses `search` parameter in some endpoints
- Date range uses `from`/`to` in events

### 4.4 Default Behaviors

| Behavior | Pattern |
|----------|---------|
| No pagination | Return all results |
| No filters | Return all results |
| Empty result | Return `[]` (empty array) |
| Invalid filter value | Silently ignored (no 400 error) |

---

## 5. Mutation Semantics Patterns

### 5.1 Create Operations

| Characteristic | Observation |
|----------------|-------------|
| Status code | 200 (most), 201 (vehicles, equipment, individual-reviews, projects/events) |
| Response body | Created entity with ID |
| Validation | Returns 400 on failure with `{ error: string }` |
| Transaction usage | `prisma.$transaction` used in: projects, hr, contacts/import, admin/import-contacts/save |

### 5.2 Update Operations

| Characteristic | Observation |
|----------------|-------------|
| Status code | 200 |
| Response body | Updated entity |
| Not found | Returns 404 |
| Transaction usage | `prisma.$transaction` used in: projects, equipment |

### 5.3 Delete Operations

| Characteristic | Observation |
|----------------|-------------|
| Status code | 200 |
| Response body | `{ success: true }` |
| Not found | Some check first (hr, projects), some rely on Prisma error |
| Cascade behavior | Manual cascade in some (events/[id]: deletes files first; hr/[id]: deletes linked user) |

### 5.4 Idempotency / Retry Safety

| Pattern | Location | Observation |
|---------|----------|-------------|
| Duplicate check on create | HR, vehicles, equipment | Check for existing before create, return 400 if duplicate |
| Idempotency keys | Not found | No idempotency key header support observed |
| DELETE idempotency | Not consistent | Some return 404 on already-deleted, some would throw Prisma error |

### 5.5 Partial Failure Behavior

#### Pattern API-PI-016: All-or-Nothing Transactions

**Description:** Batch operations use transactions to ensure atomicity.

| Endpoint | File Path | Transaction Scope |
|----------|-----------|-------------------|
| `/api/contacts/import` | `src/app/api/contacts/import/route.ts:50-118` | All contacts in batch |
| `/api/admin/import-contacts/save` | `src/app/api/admin/import-contacts/save/route.ts:27-173` | All records in batch |
| `/api/projects` | `src/app/api/projects/route.ts:200-340` | Main project + buildings/quarters |

**Observed Characteristics:**
- Transaction rolls back on any failure
- No partial success reported
- Error thrown inside transaction aborts all changes

---

## 6. Versioning & Compatibility Signals

### 6.1 Versioned Routes

| Pattern | Observation |
|---------|-------------|
| URL versioning | **Not found** (no `/api/v1/` or `/api/v2/` patterns) |
| Header versioning | **Not found** (no `Accept-Version` or similar) |
| Query versioning | **Not found** (no `?version=` parameter) |

### 6.2 Deprecation Indicators

| Pattern | Observation |
|---------|-------------|
| Deprecation headers | **Not found** |
| Response field deprecation | **Not found** |
| Code comments | Some version comments (e.g., `// Version: 20260124`) but no deprecation notices |

### 6.3 Backward Compatibility Handling

| Pattern | Observation |
|---------|-------------|
| Field additions | Present (fields added over time based on version comments) |
| Field removals | **Not observed** |
| Semantic changes | **Not documented** |

---

## 7. Summary Statistics

### 7.1 Endpoint Count by Category

| Category | Count |
|----------|-------|
| Entity CRUD | 14 routes (7 entities × 2 routes each) |
| Sub-resource CRUD | 12 routes |
| Admin Operations | 8 routes |
| Import/Batch | 4 routes |
| File Operations | 2 routes |
| Authentication | 1 route |
| Activity Logging | 1 route |
| **Total** | **51 routes** |

### 7.2 Pattern Distribution

| Pattern ID | Pattern Name | Instance Count |
|------------|--------------|----------------|
| API-PI-001 | Direct Entity Return | 7 |
| API-PI-002 | Direct Array Return | 10 |
| API-PI-003 | Paginated Envelope Return | 1 |
| API-PI-004 | Create Returns Entity | 9 |
| API-PI-005 | Update Returns Entity | 7 |
| API-PI-006 | Delete Returns Success Object | 7 |
| API-PI-007 | Validation Error with Message | 18+ |
| API-PI-008 | Unauthenticated Error (401) | 13 |
| API-PI-009 | Forbidden Error (403) | 25 |
| API-PI-010 | Not Found Error | 17 |
| API-PI-011 | Conflict Error (409) | 0 |
| API-PI-012 | Internal Server Error | 12+ |

---

**End of Stage 5.1 API Pattern Inventory**
