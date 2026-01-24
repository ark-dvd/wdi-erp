# STAGE 2 — Non-Transactional Cascade Findings

## Scope

This is a READ-ONLY diagnostic snapshot documenting all request flows that perform multiple DB writes without a transaction, creating risk of partial state if any step fails. No modifications were made; this document serves as a frozen baseline for future integrity hardening work.

## A) High-Risk Non-Transactional Flows

- src/app/api/projects/route.ts POST: project.create → logCrud → projectManager.createMany → loop(project.create for buildings → logCrud → projectManager.createMany) → loop(project.create for quarters → logCrud → projectManager.createMany → nested loop for buildings) | Orphaned projects, quarters, buildings if any loop iteration fails | Complex nested hierarchy with 10+ sequential writes across loops
- src/app/api/projects/[id]/route.ts PUT: project.update → logCrud → projectManager.deleteMany → loop(projectManager.create) | Managers deleted but new ones not created if loop fails | Delete-then-recreate pattern without atomicity
- src/app/api/hr/[id]/route.ts DELETE: user.delete → employee.delete → logCrud | User deleted but employee remains if employee.delete fails | Inverse dependency order without transaction
- src/app/api/individual-reviews/route.ts POST: individualReview.create → contact.update (avgRating) → organization.update (avgRating) → logCrud | Review exists but aggregates inconsistent if rating updates fail | Three-entity cascade without atomicity
- src/app/api/contacts/route.ts POST: organization.create (conditional) → contact.create → logCrud | Orphan organization if contact.create fails | Dependent creation without rollback
- src/app/api/admin/duplicates/[id]/merge/route.ts POST: mergeOrganizations/mergeContacts (external) → duplicateSet.update → logActivity | Merge completes but status not updated if duplicateSet.update fails | External function result not coordinated with status

## B) Medium-Risk Flows

- src/app/api/hr/route.ts POST: employee.create → logCrud → user.update (link) | Employee exists unlinked if user.update fails
- src/app/api/hr/[id]/route.ts PUT: employee.update → logCrud | Audit trail incomplete if log fails
- src/app/api/projects/[id]/route.ts DELETE: projectManager.deleteMany → project.delete → logCrud | Managers deleted but project remains if project.delete fails
- src/app/api/projects/[id]/events/route.ts POST: projectEvent.create → loop(eventFile.create) → async text extraction | Partial files if loop interrupted
- src/app/api/events/from-email/route.ts POST: projectEvent.create → loop(GCS upload → eventFile.create) | Partial attachments if external upload or DB write fails mid-loop
- src/app/api/admin/duplicates/[id]/undo/route.ts POST: undoMerge (external) → duplicateSet.update → logActivity | Undo completes but status not updated
- src/app/api/contacts/import/route.ts POST: loop(contact.create with try/catch continue) | Partial import with some contacts missing
- src/app/api/admin/import-contacts/save/route.ts POST: loop(organization.findFirst → organization.create/update → contact.create/update) → importLog.create | Partial import, no batch atomicity
- src/app/api/admin/duplicates/scan/route.ts POST: loop(duplicateSet.create) | Partial scan results if interrupted

## C) Existing Transaction Usage (Good)

- src/app/api/equipment/route.ts POST: equipment.update + equipmentAssignment.create wrapped in prisma.$transaction
- src/app/api/equipment/[id]/route.ts PUT: equipmentAssignment.update (close) + equipmentAssignment.create (new) wrapped in prisma.$transaction
- src/app/api/vehicles/[id]/assign/route.ts POST: vehicleAssignment.updateMany + vehicleAssignment.create + vehicle.update wrapped in prisma.$transaction
- src/app/api/vehicles/[id]/assign/route.ts DELETE: vehicleAssignment.updateMany + vehicle.update wrapped in prisma.$transaction
- src/lib/duplicate-detection.ts: mergeContacts and mergeOrganizations use prisma.$transaction for MergeHistory + entity transfers + rating recalculations + delete

## D) Silent Partial-Failure Patterns

- src/app/api/contacts/import/route.ts: try/catch continue in loop | Failed contacts silently skipped, import reports success
- src/app/api/admin/import-contacts/save/route.ts: try/catch continue per item | Failed items logged but import continues, partial data
- src/app/api/organizations/import/route.ts: try/catch continue in loop | Failed orgs skipped silently
- src/lib/activity.ts: fire-and-forget logging with internal try/catch | Log failures never surface to caller
- src/app/api/extract-text/route.ts: async text extraction after response | Extraction failures not reported to original request
- src/app/api/projects/route.ts: logCrud calls between writes | Log failure swallowed, next write proceeds
- src/app/api/individual-reviews/route.ts: rating cascade after review create | If contact.update fails, review exists with stale aggregates, no error returned
