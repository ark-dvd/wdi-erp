---
Product Document ID: P003
Document Title: Core User Journeys & Lifecycle
Document Type: Product Canon
Status: Canonical
Author: Product Leadership
Owner: Product Leadership
Signatory: Chief Product Officer (CPO)
Canonical Conformance Review: Chief Technology Officer (CTO)
Authority Level: Product Canon
Authority Relationship: Subordinate to Technical & Governance Canon
Timezone: America/Chicago (CST)
Created At: 2026-01-23 18:10:00 CST
Last Updated: 2026-01-23 16:21:00 CST
Current Version: v1.2
---

# P003 — Core User Journeys & Lifecycle

---

## 1. Purpose

This document defines the primary user journeys within the WDI ERP system—the paths users take to accomplish their goals.

Journeys are not features. Journeys are the sequences of interactions that deliver value. Features exist to enable journeys, not the reverse.

---

## 2. Journey Principles

### 2.1 Task Completion Focus

Every journey has a clear completion state. Users should know when they have succeeded.

### 2.2 Minimum Viable Path

The shortest path to task completion is the default path. Advanced options exist but do not obstruct the basic flow.

### 2.3 Recovery Over Prevention

When errors occur, recovery is easy. The system does not rely solely on preventing mistakes; it enables correction.

### 2.4 Context Preservation

Users do not lose work. Navigation does not discard unsaved changes without warning. Sessions preserve state.

---

## 3. Journey Categories

### 3.1 Data Entry Journeys

Creating and modifying operational records.

### 3.2 Data Retrieval Journeys

Finding and viewing existing information.

### 3.3 Administrative Journeys

Managing users, configuration, and system settings.

### 3.4 Agent Interaction Journeys

Querying the system through natural language.

---

## 4. Core Data Entry Journeys

### 4.1 Log an Event

**Trigger:** User needs to record an operational occurrence.

**Steps:**
1. Navigate to Events module (or use quick-add)
2. Select event type
3. Select associated project
4. Enter event details
5. Attach files if applicable
6. Save event

**Completion:** Event appears in project event log with correct attribution.

**Variations:**
- Mobile: Simplified flow via PWA
- With attachments: File upload integrated
- Cross-project: Event linked to multiple projects (if supported)

### 4.2 Create a Project Record

**Trigger:** New project requires system tracking.

**Steps:**
1. Navigate to Projects module
2. Select "Create Project"
3. Select project type (mega-project, quarter, or building)
4. Select parent (if not mega-project)
5. Enter project details
6. Save project

**Completion:** Project appears in hierarchy with correct parent relationship.

### 4.3 Add an Employee

**Trigger:** New employee joins organization.

**Steps:**
1. Navigate to HR module
2. Select "Add Employee"
3. Enter personal information
4. Assign organizational role
5. Upload required documents
6. Save employee record

**Completion:** Employee appears in directory, can be assigned to projects/vehicles/equipment.

### 4.4 Register a Vendor

**Trigger:** New vendor relationship established.

**Steps:**
1. Navigate to Vendors module
2. Select "Add Organization"
3. Enter organization details
4. Add contact persons
5. Categorize vendor
6. Save vendor record

**Completion:** Vendor available for project association and rating.

### 4.5 Record a Vehicle

**Trigger:** Vehicle added to fleet.

**Steps:**
1. Navigate to Vehicles module
2. Select "Add Vehicle"
3. Enter vehicle details
4. Upload documents (registration, insurance)
5. Set initial assignment if applicable
6. Save vehicle record

**Completion:** Vehicle appears in fleet, available for assignment tracking.

---

## 5. Core Data Retrieval Journeys

### 5.1 Find Project Status

**Trigger:** User needs current state of a project.

**Steps:**
1. Navigate to Projects module
2. Search or browse to project
3. View project dashboard
4. Review recent events
5. Check assignments and resources

**Completion:** User has visibility into project state.

### 5.2 Look Up Employee Information

**Trigger:** User needs employee details or documents.

**Steps:**
1. Navigate to HR module
2. Search for employee
3. View employee profile
4. Access documents if authorized
5. Review assignments

**Completion:** User has required employee information.

### 5.3 Review Vendor History

**Trigger:** User needs vendor performance context.

**Steps:**
1. Navigate to Vendors module
2. Search for vendor
3. View organization profile
4. Review project-specific ratings
5. Check contact information

**Completion:** User understands vendor relationship and performance.

### 5.4 Check Vehicle Availability

**Trigger:** User needs to assign or locate a vehicle.

**Steps:**
1. Navigate to Vehicles module
2. Browse or search vehicles
3. View assignment status
4. Check document validity
5. Review assignment history

**Completion:** User knows vehicle status and availability.

### 5.5 Correct an Existing Record

**Trigger:** User identifies an error in previously entered data.

**Steps:**
1. Navigate to the relevant module
2. Locate the record requiring correction
3. Verify authorization to edit (system enforces per DOC-006)
4. Enter correction while preserving original attribution
5. Save changes (system records updatedAt and updatedBy)

**Completion:** Record reflects accurate information. Original creation attribution is preserved. Audit trail captures the modification with actor, timestamp, and change details per DOC-008.

**Constraints:**
- Correction does not delete original audit history
- Field-level change tracking where implemented
- Soft-deleted records cannot be edited (must be restored first)

---

## 6. Agent Interaction Journeys

### 6.1 Quick Lookup Query

**Trigger:** User needs specific information quickly.

**Steps:**
1. Access WDI Agent
2. Enter natural language query in Hebrew
3. Review agent response
4. Follow up if needed

**Completion:** User has the requested information.

**Example Queries:**
- "מי הקבלן של פרויקט אורן?"
- "כמה אירועים נרשמו השבוע?"
- "איזה רכבים מוקצים לדני?"

### 6.2 Exploratory Query

**Trigger:** User needs to understand patterns or relationships.

**Steps:**
1. Access WDI Agent
2. Enter exploratory query
3. Review response
4. Refine query based on results
5. Repeat until satisfied

**Completion:** User understands the pattern or relationship.

**Example Queries:**
- "מה הספקים שעבדו עם יותר מ-3 פרויקטים?"
- "מה האירועים הכי נפוצים בפרויקטים בחיפה?"

### 6.3 Agent Limitation Encounter

**Trigger:** User asks agent something it cannot do.

**Steps:**
1. User enters query or request
2. Agent recognizes limitation
3. Agent explains what it cannot do
4. Agent suggests alternative (module navigation, human contact)

**Completion:** User understands the limitation and has a path forward.

**Example Limitations:**
- Write requests → Directed to appropriate module
- Out-of-scope questions → Explained and redirected
- Authorization boundaries → Indicated without detail leak

---

## 7. Administrative Journeys

### 7.1 Create a User

**Trigger:** New employee needs system access.

**Steps:**
1. Navigate to Administration module
2. Select user management
3. Create user record (linked to HR employee record)
4. Assign organizational role
5. Confirm Google OAuth eligibility
6. Save user

**Completion:** User can authenticate and access system per role permissions.

### 7.2 Modify User Role

**Trigger:** Employee's responsibilities change.

**Steps:**
1. Navigate to Administration module
2. Locate user record
3. Modify role assignment
4. Save changes

**Completion:** User's permissions reflect new role immediately.

### 7.3 Deactivate a User

**Trigger:** Employee leaves organization.

**Steps:**
1. Navigate to Administration module
2. Locate user record
3. Mark user as inactive
4. Confirm deactivation

**Completion:** User can no longer authenticate. Historical attributions preserved.

---

## 8. Journey Error Handling

### 8.1 Validation Errors

When user input fails validation:
- Specific field errors are displayed
- Valid fields retain their values
- User corrects and resubmits

### 8.2 Authorization Errors

When user lacks permission:
- Clear message indicates lack of permission
- No sensitive detail about permission structure
- Alternative path suggested if available

### 8.3 System Errors

When system encounters unexpected error:
- User-friendly error message displayed
- Technical details logged (not shown to user)
- Retry suggested where appropriate
- Support path indicated for persistent issues

### 8.4 Connectivity Errors

When network issues occur:
- Offline state indicated clearly
- Local state preserved where possible
- Sync attempted when connectivity returns
- User informed of sync status

---

## 9. Journey Performance Expectations

### 9.1 Response Time

Per DOC-007 SLOs:
- UI interaction response < 200ms perceived
- Page load < 1000ms initial
- API response P95 < 500ms

### 9.2 Journey Completion

Journeys should be completable:
- Without unexpected interruption
- Without data loss
- With clear success/failure indication

---

## 10. Journey Instrumentation

### 10.1 Logging

All journeys generate logs per DOC-008:
- User identity
- Actions taken
- Timestamps
- Outcomes

### 10.2 Metrics

Journey metrics tracked:
- Completion rate
- Time to completion
- Error frequency
- Abandonment points

---

## 11. Relationship to Canonical Baseline

### 11.1 Binding Documents

This product document is bound by:
- DOC-001: System Identity (what journeys are possible)
- DOC-006: Authorization Model (permission boundaries in journeys)
- DOC-007: Performance, Reliability & SLOs (journey performance expectations)
- DOC-008: Observability & Audit Trail (journey instrumentation)

### 11.2 Conformance Requirement

All journeys must respect authorization boundaries. No journey can enable actions the user is not permitted to perform.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 18:10:00 CST | Claude (acting CPO) | Initial draft of Core User Journeys & Lifecycle |
| v1.0 | 2026-01-23 18:10:00 CST | Claude (acting CPO) | Promotion to Canonical Product Baseline |
| v1.1 | 2026-01-23 18:35:00 CST | Claude (acting CPO) | Added record correction journey (§5.5) per Canon Hardening Pass |
| v1.2 | 2026-01-23 16:21:00 CST | Product Leadership | Canon hardening pass (audit alignment, authority clarification, timestamp governance) |

---

End of Document
