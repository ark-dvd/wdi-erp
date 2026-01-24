---
Document ID: INSTR-001
Document Title: Project Instructions & AI Collaboration Rules
Document Type: Project Instruction
Status: Active
Timezone: America/Chicago (CST)
Created At: 2026-01-23 23:04:58 CST
Last Updated: 2026-01-23 23:04:58 CST
Version Tag: 20260123-230458
---

# INSTR-001 — Project Instructions & AI Collaboration Rules (20260123-230458)

## 1. Purpose

This document defines **how we work** on the WDI-ERP project when collaborating with AI (Claude / ChatGPT), under strict constraints:
- **Security-first**
- **Zero Data Loss**
- **Zero Regression**
- Canon-first governance

These rules exist to prevent repeated mistakes, uncontrolled refactors, and “AI drift”.

## 2. Communication & Execution Mode (Non-Negotiable)

### 2.1 One Instruction per Step
At any point in time, the assistant must provide **exactly one** of the following:
- **One copy-paste command** (CMD / shell), OR
- **One complete file** (full content), OR
- **One explicit patch** (limited to specific lines/blocks)

No multi-step sequences. No “do A then B then C”.  
After the single step is executed, we pause for confirmation / feedback before proceeding.

### 2.2 No “Show Me Files” Workflow
Do **not** ask the user to paste long code or “show you” files as a default workflow.
Assume the assistant already has the canonical documents and provided archives used in this project context.
If a file is truly missing, request **only the minimal snippet** required, with a clear reason.

## 3. Artifact & Version Discipline

### 3.1 Whole-File Delivery via Artifacts
When creating or updating a file, the assistant must provide the **entire file content** as an artifact (downloadable file) whenever possible.

### 3.2 Version Tag Requirement
Every created/updated file must include a **version tag** of the form:
`YYYYMMDD-HHMMSS` (CST)

- The assistant must derive time from a reliable clock in **America/Chicago (CST)** and must not invent timestamps.
- If a tool-based time value is available, it must be used.
- If time is unknown, the assistant must explicitly state that it cannot reliably stamp the file and must not guess.

### 3.3 Path Must Be Explicit
Whenever instructing the user to replace or add a file, the assistant must provide the **full repository-relative path**, e.g.:
`src/app/api/projects/route.ts`

No ambiguous references like “update the projects route”.

## 4. Change Control (Scope Discipline)

### 4.1 Fix Only What Was Asked
When asked to fix something, the assistant must:
- Fix **only** the requested issue
- Avoid opportunistic refactors
- Avoid changing functionality, UI layout, colors, fonts, spacing, or structure unless explicitly requested

### 4.2 No Aggressive Rewrites
Even if the assistant believes the code “should be redesigned”, it must not:
- restructure modules
- rename concepts
- change UX patterns
- reformat extensively

Unless the user explicitly requested such changes.

## 5. Avoid Repeating Past Mistakes

The assistant must treat repeated failure patterns as an incident:
- Before proposing a solution, verify it is not a previously attempted approach that failed.
- If it was attempted and failed, propose a different approach with clear reasoning.

## 6. Canon & Documentation Rules

### 6.1 Canon Precedence
Technical Canon (DOC-xxx) overrides Product Canon (P-xxx).
No product change may bypass technical constraints.

### 6.2 Language Standard
User-facing communications are in Hebrew; technical documentation may be in English.

## 7. Codebase File Manifest (Mandatory Governance Artifact)

### 7.1 What It Is
A **complete inventory** of the repository files, including:
- File path
- File name
- Last modified timestamp
- File size
- (Optional) content hash

### 7.2 Why It Exists
- Enforce **Zero Regression**
- Provide operational auditability
- Prevent undocumented drift
- Provide reliable, read-only context for AI collaborators

### 7.3 How It Is Maintained
- Generated automatically from filesystem/git
- Never maintained manually
- Snapshot at:
  - Stage 0 baseline
  - Before each stage
  - After each stage

### 7.4 Required Outputs
- `CODEBASE_FILE_MANIFEST.csv` (or `.md`)
- Stored at repo root or `docs/audit/`

### 7.5 AI Rule (Critical)
AI assistants must not fabricate or infer manifest entries.
They may consume it as read-only context and must respect “Anchor / Read-only” designations.

---

## Appendix A — Current Manifest Artifact

The latest manifest file produced from the provided project archive is:
- `CODEBASE_FILE_MANIFEST.csv`

This file is treated as a baseline snapshot and should be committed to the repository under:
- `docs/audit/CODEBASE_FILE_MANIFEST_20260123-230458.csv` (recommended)

---

End of Document
