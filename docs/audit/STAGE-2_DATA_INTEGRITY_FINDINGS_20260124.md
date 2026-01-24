# STAGE 2 — Data Integrity Baseline

## Scope

This is a READ-ONLY diagnostic snapshot documenting all data mutation points in the wdi-erp codebase as of 2026-01-24. It captures direct DB writes, derived data writes, cascading side-effects, non-transactional risks, and seed/migration assumptions. No modifications were made; this document serves as a frozen baseline for future integrity hardening work.

## A) Direct DB Writes

- src/lib/auth.ts: update | User | login callback | Updates lastLogin, name, image
- src/lib/activity.ts: create | ActivityLog | logActivity/logCrud/logAgentQuery | Fire-and-forget audit log
- src/app/api/hr/route.ts: create | Employee | POST | Creates employee record
- src/app/api/hr/route.ts: create/update | User | POST (side effect) | Auto-creates or links user for allowed domain emails
- src/app/api/hr/[id]/route.ts: update | Employee | PUT | Updates all employee fields
- src/app/api/hr/[id]/route.ts: delete | User+Employee | DELETE | Deletes linked user then employee
- src/app/api/contacts/route.ts: create | Contact | POST | Creates contact record
- src/app/api/contacts/route.ts: create | Organization | POST (side effect) | Auto-creates org if no organizationId
- src/app/api/contacts/[id]/route.ts: update | Contact | PUT | Updates contact fields
- src/app/api/contacts/[id]/route.ts: delete | Contact | DELETE | Hard delete
- src/app/api/contacts/import/route.ts: create | Contact | POST | Batch create in loop
- src/app/api/organizations/route.ts: create | Organization | POST | Creates organization
- src/app/api/organizations/[id]/route.ts: update | Organization | PUT | Updates organization
- src/app/api/organizations/[id]/route.ts: delete | Organization | DELETE | Hard delete
- src/app/api/organizations/import/route.ts: create | Organization | POST | Batch create
- src/app/api/projects/route.ts: create | Project | POST | Creates project with hierarchy
- src/app/api/projects/route.ts: createMany | ProjectManager | POST | Bulk manager links
- src/app/api/projects/[id]/route.ts: update | Project | PUT | Updates project fields
- src/app/api/projects/[id]/route.ts: deleteMany+create | ProjectManager | PUT | Replaces manager links
- src/app/api/projects/[id]/route.ts: delete | Project+ProjectManager | DELETE | Deletes managers then project
- src/app/api/projects/[id]/events/route.ts: create | ProjectEvent+EventFile | POST | Creates event with nested files
- src/app/api/projects/[id]/contacts/route.ts: create/update | ContactProject | POST/PUT | Links contacts to projects
- src/app/api/events/[id]/route.ts: update/delete | ProjectEvent | PUT/DELETE | Event modifications
- src/app/api/events/from-email/route.ts: create | ProjectEvent+EventFile | POST | External API creates events with attachments
- src/app/api/individual-reviews/route.ts: create | IndividualReview | POST | Creates review with calculated avgRating
- src/app/api/individual-reviews/[id]/route.ts: update/delete | IndividualReview | PUT/DELETE | Review modifications
- src/app/api/vehicles/route.ts: create | Vehicle | POST | Creates vehicle record
- src/app/api/vehicles/[id]/route.ts: update/delete | Vehicle | PUT/DELETE | Vehicle modifications
- src/app/api/vehicles/[id]/accidents/route.ts: create/update/delete | VehicleAccident | CRUD | Accident records
- src/app/api/vehicles/[id]/services/route.ts: create/update/delete | VehicleService | CRUD | Service records
- src/app/api/vehicles/[id]/fuel/route.ts: create/update/delete | VehicleFuelLog | CRUD | Fuel records
- src/app/api/vehicles/[id]/tolls/route.ts: create/update/delete | VehicleTollRoad | CRUD | Toll records
- src/app/api/vehicles/[id]/parking/route.ts: create/update/delete | VehicleParking | CRUD | Parking records
- src/app/api/vehicles/[id]/tickets/route.ts: create/update/delete | VehicleTicket | CRUD | Ticket records
- src/app/api/vehicles/[id]/documents/route.ts: create/update/delete | VehicleDocument | CRUD | Document records
- src/app/api/vehicles/[id]/photos/route.ts: create/update/delete | VehiclePhoto | CRUD | Photo records
- src/app/api/vehicles/[id]/assignments/route.ts: create/update | VehicleAssignment | POST/PUT | Driver assignments
- src/app/api/vehicles/[id]/assign/route.ts: update+create | Vehicle+VehicleAssignment | POST | Assigns driver
- src/app/api/equipment/route.ts: create | Equipment | POST | Creates equipment
- src/app/api/equipment/[id]/route.ts: update/delete | Equipment | PUT/DELETE | Equipment modifications
- src/app/api/admin/duplicates/scan/route.ts: create | DuplicateSet | POST | Creates duplicate candidates in loop
- src/app/api/admin/duplicates/[id]/route.ts: update | DuplicateSet | PUT | Updates status to dismissed
- src/app/api/admin/duplicates/[id]/merge/route.ts: calls mergeOrganizations/mergeContacts | Multiple | POST | Merge operation
- src/app/api/admin/duplicates/[id]/undo/route.ts: calls undoMerge | Multiple | POST | Undo operation
- src/app/api/admin/import-contacts/save/route.ts: create | Contact | POST | Batch create
- src/app/api/extract-text/route.ts: update | EventFile | POST | Stores extracted text
- src/lib/duplicate-detection.ts: transaction | MergeHistory+Contact/Org | mergeContacts/mergeOrganizations | Full transactional merge

## B) Derived Data Writes

- src/app/api/individual-reviews/route.ts: avgRating | Calculated from criteria fields | On review create | Stored in IndividualReview
- src/app/api/individual-reviews/route.ts: averageRating+reviewCount | Aggregated from reviews | After review create | Stored in Contact
- src/app/api/individual-reviews/route.ts: averageRating+reviewCount | Weighted average from contacts | After contact update | Stored in Organization
- src/lib/duplicate-detection.ts: averageRating+reviewCount | Recalculated from reviews | After merge | Stored in Contact/Organization

## C) Cascading / Side-Effect Writes

- src/app/api/hr/route.ts: Employee POST with allowed domain email | Creates User record if not exists, or links if exists | Auto-provisioning
- src/app/api/contacts/route.ts: Contact POST without organizationId | Auto-creates Organization with contact name | Implicit org creation
- src/app/api/projects/route.ts: Project POST with buildings/quarters arrays | Creates child Projects and ProjectManager links | Hierarchical creation
- src/app/api/projects/[id]/route.ts: Project PUT with managerIds | Deletes all existing managers then recreates | Replace pattern
- src/app/api/vehicles/route.ts: Vehicle POST with currentDriverId | Creates VehicleAssignment in transaction | Driver assignment
- src/app/api/projects/[id]/events/route.ts: Event POST with files | Creates EventFiles then triggers async text extraction | Background processing
- src/app/api/events/from-email/route.ts: Event POST with attachments | Uploads to GCS then creates EventFile records | External integration
- src/app/api/individual-reviews/route.ts: Review POST | Updates Contact rating then Organization rating | Rating cascade
- src/app/api/hr/[id]/route.ts: Employee DELETE with linked user | Deletes User record first | Cascade delete
- src/lib/duplicate-detection.ts: mergeOrganizations | Creates MergeHistory, transfers contacts, recalculates ratings, deletes merged | Transaction
- src/lib/duplicate-detection.ts: mergeContacts | Creates MergeHistory, transfers reviews+projects, recalculates ratings, deletes merged | Transaction
- src/lib/duplicate-detection.ts: undoMerge | Restores entity from snapshot, restores relations, marks history as undone | Transaction

## D) Non-Transactional Risk

- src/app/api/hr/route.ts: Employee create → logCrud → User create/update | If User create fails, Employee exists without user link
- src/app/api/contacts/route.ts: Organization create → Contact create | If Contact create fails, orphan Organization exists
- src/app/api/projects/route.ts: Project create → log → managers → buildings loop | Partial hierarchy if loop fails mid-way
- src/app/api/projects/[id]/route.ts: Project update → log → deleteMany managers → create managers loop | Managers may be partially recreated
- src/app/api/individual-reviews/route.ts: Review create → Contact rating update → Organization rating update | Ratings may be inconsistent if later updates fail
- src/app/api/events/from-email/route.ts: Event create → attachment loop (upload + EventFile create) | Partial attachments if loop fails
- src/app/api/contacts/import/route.ts: Loop of Contact creates with error catch-continue | Partial import with logged errors
- src/app/api/admin/duplicates/scan/route.ts: Loop of DuplicateSet creates | Partial scan results if interrupted
- src/app/api/hr/[id]/route.ts: User delete → Employee delete | If Employee delete fails, user deleted but employee remains

## E) Seeds / Migrations That Affect Runtime Assumptions

- prisma/seed.ts: Deletes all RolePermission, Permission, User, Role, AllowedDomain then recreates | Destructive, assumes fresh DB
- prisma/seed.ts: Creates AllowedDomain entries for wdi.one and wdiglobal.com | Domain allowlist baseline (note: auth.ts uses hardcoded constant, not DB)
- prisma/seed.ts: Creates 7 roles with Hebrew displayNames | Role names are hardcoded references in auth checks
- prisma/seed.ts: Creates 32 permissions (8 modules × 4 actions) | Permission format module:action is convention
- prisma/seed.ts: Creates initial user arik@wdi.one with founder role | Bootstrap admin access
- prisma/seed.ts: Role-permission mappings define RBAC baseline | founder/ceo get all, others get subsets
