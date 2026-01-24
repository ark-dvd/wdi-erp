# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WDI ERP is an Israeli enterprise resource planning system built with Next.js 14, React 18, TypeScript, and PostgreSQL/Prisma. It manages HR, projects, equipment, vehicles, contacts, organizations, events, and financial data with full Hebrew (RTL) support.

**Key Technologies:** Next.js 14 (App Router), Prisma 5.22, NextAuth v5 (Google OAuth), Google Gemini API, Google Cloud Storage, Tailwind CSS, Lucide React icons.

## Build & Development Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Prisma generate + Next.js build
npm start            # Production server
npm run lint         # Next.js linter
```

Note: `prisma generate` runs automatically via postinstall and build scripts. No test runner is currently configured.

## Architecture

```
src/
├── app/
│   ├── api/              # 50+ API endpoints (auth, admin, contacts, hr, projects, equipment, vehicles, events, agent)
│   ├── dashboard/        # Main authenticated UI (45+ pages)
│   ├── m/                # Mobile routes (agent, events, vehicles)
│   └── login/            # Auth UI
├── components/           # React components (EmployeeForm.tsx is 44KB with complex HR form state)
├── lib/                  # Core utilities
│   ├── auth.ts           # NextAuth config with domain whitelist
│   ├── prisma.ts         # Prisma singleton
│   ├── activity.ts       # Audit logging (logCrud, logLogin, logSearch, etc.)
│   ├── agent-queries.ts  # 44KB - AI agent query functions (40+ queries)
│   ├── agent-normalizer.ts   # Hebrew ↔ English status normalization
│   ├── agent-redaction.ts    # Sensitive field filtering for AI
│   ├── duplicate-detection.ts  # Levenshtein + Gemini-based duplicate detection
│   └── gemini.ts         # Gemini API integration
└── hooks/
    └── useActivityLog.ts

prisma/
├── schema.prisma         # 898 lines, 37 models
└── seed.ts               # Database initialization with roles/permissions

docs/canon/               # Constitutional governance documents (NON-NEGOTIABLE)
```

## Database Schema (Key Models)

- **Auth:** User, Role, Permission, RolePermission, AllowedDomain
- **HR:** Employee, IndividualReview
- **Projects:** Project, ProjectManager, ProjectCoordinator, ProjectContact, ProjectEvent
- **Contacts:** Contact, ContactProject, Organization
- **Equipment:** Equipment, EquipmentAssignment
- **Vehicles:** Vehicle, VehicleAssignment, VehicleService, VehicleAccident, VehicleFuelLog, VehicleTollRoad, VehicleParking, VehicleTicket, VehicleDocument, VehiclePhoto
- **System:** ActivityLog, ImportLog, DuplicateSet, MergeHistory

All entities require `id`, `createdAt`, `updatedAt`. Audit fields: `createdBy`/`updatedBy` link to User.

## Authentication & Authorization

- Google OAuth only, domain-restricted to `wdi.one` and `wdiglobal.com`
- Session enriched with: `role`, `roleDisplayName`, `employeeId`, `permissions[]`
- Permissions format: `module:action` (e.g., `hr:view`, `admin:delete`)
- **CRITICAL:** Always validate permissions server-side, never UI-only

User roles: `founder`, `ceo`, `office_manager`, `department_manager`, `project_manager`, `secretary`, `employee`

## API Patterns

```typescript
// All routes check session
const session = await auth();
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Role-based access
if (!hasPermission(session.user.permissions, 'module:action')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Log all mutations
await logCrud(action, targetType, targetId, targetName, userId);
```

API file versioning: include `// Version: YYYYMMDDhhmmss` comment.

## Constitutional Governance

The `docs/canon/` directory contains canonical documents that define non-negotiable system principles. **Code defers to these documents in conflicts.**

Key documents:
- **DOC-007 (RBAC):** Server-side permission enforcement mandatory, no anonymous releases
- **DOC-011 (Data Model):** Single source of truth, soft deletes with audit, forward-only migrations
- **DOC-013 (Testing):** Critical paths tested first (data mutations, auth, financial logic), no red tests on release

## Hebrew Language Handling

- Field values often in Hebrew (עברית): statuses, enums, labels
- Use `agent-normalizer.ts` to normalize Hebrew ↔ English status fields
- UI components are RTL-aware with Heebo font

## Key Gotchas

1. **Domain whitelist:** Only `wdi.one` and `wdiglobal.com` emails can authenticate
2. **GCS file access:** Images must go through `/api/file?url=...` proxy
3. **Agent queries:** Sensitive fields (`grossSalary`, `idNumber`, personal emails) are redacted via `agent-redaction.ts`
4. **Prisma migrations:** Run `prisma generate` after schema changes
5. **Activity logging:** Fire-and-forget async - don't rely on immediate availability

## Environment Variables

```bash
DATABASE_URL              # PostgreSQL connection string
GOOGLE_CLIENT_ID          # OAuth client ID
GOOGLE_CLIENT_SECRET      # OAuth client secret
NEXTAUTH_SECRET           # Session encryption key
AUTH_SECRET               # Same as NEXTAUTH_SECRET
AUTH_TRUST_HOST           # Set to "true"
GCS_BUCKET_NAME           # Google Cloud Storage bucket
GOOGLE_APPLICATION_CREDENTIALS  # Path to GCS service account JSON
GEMINI_API_KEY            # For duplicate detection and agent queries
```

## Deployment

Docker multi-stage build with Node 20 Alpine. Production runs on port 8080. Requires PostgreSQL with openssl.

## Execution Rules (NON-NEGOTIABLE)

- This repository is in Stage 1 (Execution Mode). Safety and zero-regression override speed.
- Before modifying any existing code file, you MUST open and read the file first.
- When fixing code, apply minimal, surgical changes only. Rewrites are forbidden unless explicitly requested.
- Work on ONE task and ONE file at a time unless instructed otherwise.
- Do NOT modify dependencies (package.json / package-lock.json) unless explicitly instructed.
- Do NOT create or run migrations unless explicitly instructed.
- Do NOT commit changes automatically. The user controls all git commits.
- Canonical documents under docs/canon/ override code and AI suggestions in any conflict.
