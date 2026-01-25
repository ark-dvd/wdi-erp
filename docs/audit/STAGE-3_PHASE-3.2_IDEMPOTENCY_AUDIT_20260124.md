# STAGE 3 — Phase 3.2 Idempotency & Replay Safety Audit

**Date:** 2026-01-24
**Branch:** stage1-auth-policy-alignment
**Auditor:** Claude Code (READ-ONLY)

---

## A) Summary

| Metric | Count |
|--------|-------|
| **Total endpoints reviewed** | 12 |
| **SAFE (idempotent or guarded)** | 10 |
| **RISK (replay can cause issues)** | 2 |

**Result: FAIL** (2 endpoints with replay risk)

---

## B) Detailed Findings

### Import Endpoints

| File | Endpoint | Operation Type | Idempotency Status | Notes |
|------|----------|----------------|-------------------|-------|
| `src/app/api/contacts/import/route.ts` | POST | Bulk create | **SAFE** | Dedup by phone/email, skips existing, transaction-wrapped, returns counts |
| `src/app/api/organizations/import/route.ts` | POST | Bulk create | **RISK** | Dedup by name, but NOT in transaction; partial failures possible |
| `src/app/api/admin/import-contacts/save/route.ts` | POST | Bulk upsert | **SAFE** | Upsert pattern (create or update), transaction-wrapped, returns counts |
| `src/app/api/admin/import-contacts/parse/route.ts` | POST | Analysis only | **SAFE** | No data mutations, returns parsed results for preview |
| `src/app/api/admin/import-contacts/enrich/route.ts` | POST | API call only | **SAFE** | No data mutations, returns enriched results for preview |

### Admin/Batch Operations

| File | Endpoint | Operation Type | Idempotency Status | Notes |
|------|----------|----------------|-------------------|-------|
| `src/app/api/admin/duplicates/scan/route.ts` | POST | Batch create | **SAFE** | Checks for existing DuplicateSet before creating, skips if pair exists |
| `src/app/api/admin/duplicates/[id]/route.ts` | PUT | Status update | **SAFE** | Simple update on existing record, inherently idempotent |
| `src/app/api/admin/duplicates/[id]/merge/route.ts` | POST | Merge operation | **SAFE** | Checks `status === 'merged'` before executing, prevents double merge |
| `src/app/api/admin/duplicates/[id]/undo/route.ts` | POST | Undo operation | **SAFE** | Checks `status !== 'merged'` and `undoneAt: null`, prevents double undo |

### External/Async Triggers

| File | Endpoint | Operation Type | Idempotency Status | Notes |
|------|----------|----------------|-------------------|-------|
| `src/app/api/events/from-email/route.ts` | POST | Event create | **RISK** | No dedup check, always creates new event; replay creates duplicates |
| `src/app/api/extract-text/route.ts` | POST | Text extraction | **SAFE** | Checks `extractedText` already exists, returns early if processed |

---

## C) Endpoints with Replay Risk

### RISK 1: `src/app/api/organizations/import/route.ts` POST

**Issue:** Not transaction-wrapped; uses try-catch continue pattern

**Current Behavior:**
```typescript
for (const org of organizations) {
  try {
    const existing = await prisma.organization.findFirst({ where: { name: ... } })
    if (existing) { results.skipped++; continue }
    await prisma.organization.create({ ... })  // Outside transaction
    results.created++
  } catch (err) {
    results.errors.push(...)  // Continues on error
  }
}
```

**Risk:**
- Partial import on failure (some created, some failed)
- Retry creates additional duplicates if prior run had errors
- Inconsistent state if API call interrupted mid-loop

**Impact:** Medium — bulk imports may leave partial data

---

### RISK 2: `src/app/api/events/from-email/route.ts` POST

**Issue:** No duplicate detection; always creates new event

**Current Behavior:**
```typescript
const event = await prisma.projectEvent.create({
  data: {
    projectId,
    eventType,
    description,  // Contains email body
    eventDate: emailDate ? new Date(emailDate) : new Date(),
    createdById: user?.id || null,
  }
})
```

**Risk:**
- Email addon retry creates duplicate events
- User clicking "Save to ERP" multiple times creates duplicates
- No idempotency key (emailId, messageId, etc.)

**Impact:** Medium — duplicate events clutter project history

---

## D) Priority Classification

| Priority | Endpoint | Risk Level | Impact |
|----------|----------|------------|--------|
| **P1** | `organizations/import` | Medium | Partial imports, data inconsistency |
| **P1** | `events/from-email` | Medium | Duplicate events on retry |

---

## E) Recommended Fixes (Not Implemented)

### For `organizations/import`:
1. Wrap entire loop in `prisma.$transaction()`
2. Throw on any create error (all-or-nothing)
3. Alternative: Use batch `createMany` with `skipDuplicates: true`

### For `events/from-email`:
1. Add `emailMessageId` field to schema
2. Check for existing event with same `messageId + projectId` before creating
3. Return existing event ID if duplicate detected

---

## F) Already Safe Patterns

### Contacts Import (SAFE)
- Transaction-wrapped: `prisma.$transaction(async (tx) => { ... })`
- Dedup by phone: `tx.contact.findFirst({ where: { phone } })`
- Dedup by email: `tx.contact.findFirst({ where: { email } })`
- Clear counts: `{ created, skipped }`

### Admin Import-Contacts/Save (SAFE)
- Transaction-wrapped
- Upsert pattern via `createOrUpdateContact()` helper
- Searches by phone, email, or name+org before creating
- Updates existing instead of creating duplicates

### Duplicate Scan (SAFE)
- Checks existing pair: `prisma.duplicateSet.findFirst({ where: { primaryId, secondaryId, status: ['pending', 'merged'] } })`
- Skips if pair already exists
- Only creates if new pair detected

### Extract Text (SAFE)
- Checks `file.extractedText` before processing
- Returns `{ alreadyExtracted: true }` if already done
- Idempotent by design

---

## G) Conclusion

**Phase 3.2 Status: FAIL**

2 endpoints lack proper idempotency guards:
1. `organizations/import` — not transaction-wrapped, partial failures possible
2. `events/from-email` — no duplicate detection, replays create duplicate events

### Remediation Required

Both P1 issues should be fixed before Phase 3.2 can pass:
- Wrap `organizations/import` in transaction
- Add `emailMessageId` dedup to `events/from-email`

---

## H) Audit Method

1. Identified all import/batch endpoints via glob pattern
2. Read each endpoint and analyzed for:
   - Transaction usage (`$transaction`)
   - Dedup checks (`findFirst`, `findUnique` before create)
   - Unique constraint reliance
   - Silent continue patterns
   - Idempotency keys
3. Classified as SAFE if replay cannot cause duplicates or corruption
4. Classified as RISK if replay can create duplicates or partial state
