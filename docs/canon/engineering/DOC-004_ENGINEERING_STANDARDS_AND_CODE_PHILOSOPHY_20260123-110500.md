---
Canonical Document ID: DOC-004
Document Title: Engineering Standards & Code Philosophy
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 11:05:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 11:05:00 CST
Last Updated: 2026-01-23 11:05:00 CST
Current Version: v1.0
---

# DOC-004 — Engineering Standards & Code Philosophy

---

## 1. Purpose

This document defines the engineering standards, coding practices, and philosophical principles that govern all software development within the WDI ERP system.

Code is not just functional output. It is organizational memory, communication between engineers, and the foundation upon which future development depends. These standards exist to ensure that code remains maintainable, comprehensible, and safe over time.

---

## 2. Engineering Philosophy

### 2.1 Clarity Over Brevity

Code must be readable by engineers who did not write it. Clever one-liners, obscure idioms, and compressed logic are forbidden when they sacrifice clarity.

The reader's time is more valuable than the writer's keystrokes. Write for the maintainer, not for yourself.

### 2.2 Explicit Over Implicit

All behavior must be traceable through the code. Hidden side effects, implicit type coercions, and magic values undermine trust in the codebase.

If behavior exists, it must be visible. If a value matters, it must be named. If a dependency exists, it must be declared.

### 2.3 Consistency Over Preference

Team consistency takes precedence over individual preference. A codebase with one mediocre pattern applied consistently is superior to a codebase with multiple "better" patterns applied inconsistently.

Style debates are settled by documented standards, not by argument. Once a standard is set, it is followed.

### 2.4 Correctness Over Speed

Correct code that is slow can be optimized. Fast code that is incorrect must be rewritten. Correctness is the foundation; performance is the refinement.

Optimization without measurement is superstition. Measure first, optimize second, verify third.

### 2.5 Simplicity Over Abstraction

Abstraction is a tool, not a goal. Every abstraction adds indirection and cognitive load. Abstractions must earn their existence by providing concrete value that exceeds their cost.

Premature abstraction is as harmful as premature optimization. Solve the problem you have, not the problem you imagine.

---

## 3. Code Standards

### 3.1 Language Standards

**TypeScript** is the primary language. All new code must be written in TypeScript with strict mode enabled.

Type safety requirements:
- `strict: true` in TypeScript configuration
- No use of `any` without explicit justification documented in comments
- No type assertions (`as`) without explicit justification
- Union types preferred over `any` for flexible inputs
- Return types must be explicit on all public functions

### 3.2 Naming Conventions

Names must be descriptive and self-documenting:

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase, descriptive nouns | `projectManager`, `eventCount` |
| Functions | camelCase, verb phrases | `createProject`, `validatePermission` |
| Classes | PascalCase, singular nouns | `ProjectService`, `EventRepository` |
| Interfaces | PascalCase, no prefix | `Project`, `UserPermission` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| Files | kebab-case | `project-service.ts`, `event-repository.ts` |
| Database tables | snake_case, plural | `projects`, `event_logs` |
| Database columns | snake_case | `created_at`, `project_id` |

Abbreviations are forbidden unless universally understood (e.g., `id`, `url`). When in doubt, spell it out.

### 3.3 Function Standards

Functions must:
- Do one thing and do it well
- Have explicit return types
- Validate inputs at boundaries
- Return early for invalid states
- Avoid side effects unless explicitly named (e.g., `saveProject`, `deleteEvent`)

Function length guidance:
- Functions exceeding 50 lines should be reviewed for extraction opportunities
- Functions exceeding 100 lines are defects unless explicitly justified

### 3.4 Error Handling

Errors must be:
- Typed and structured, not raw strings
- Caught at appropriate boundaries, not swallowed silently
- Logged with sufficient context for debugging
- Propagated with meaningful messages for callers

Error handling anti-patterns:
- Empty catch blocks are forbidden
- Generic `catch (e)` without type narrowing is forbidden
- Logging and re-throwing the same error without added context is noise

### 3.5 Comments and Documentation

Comments must explain *why*, not *what*. Code should be self-explanatory for *what*; comments exist for context that code cannot convey.

Required documentation:
- All public functions must have JSDoc comments describing purpose, parameters, and return values
- All modules must have a header comment explaining their responsibility
- All non-obvious business rules must be commented with rationale

Forbidden comments:
- Commented-out code (delete it; version control remembers)
- TODO comments without associated tracking (create a ticket or fix it)
- Comments that merely restate the code

### 3.6 Testing Standards

All code must be testable. Code that cannot be tested in isolation is poorly designed.

Testing requirements:
- Business logic must have unit tests
- API endpoints must have integration tests
- Authorization rules must have explicit test coverage
- Data mutations must be tested for correctness and audit trail generation

Test quality standards:
- Tests must be deterministic; flaky tests are defects
- Tests must be independent; order must not matter
- Tests must be fast; slow tests discourage execution
- Test names must describe the scenario and expected outcome

---

## 4. Code Review Standards

### 4.1 Review Requirements

All code changes require review before merge. Self-merging is forbidden except for documented emergency procedures.

Review scope:
- Correctness: Does the code do what it claims?
- Clarity: Can a new team member understand this?
- Consistency: Does this follow established patterns?
- Completeness: Are edge cases handled? Are tests adequate?
- Compliance: Does this respect architectural and security constraints?

### 4.2 Review Responsibilities

**Authors** must:
- Provide clear descriptions of changes and rationale
- Keep changes focused and reasonably sized
- Respond to feedback constructively
- Not merge until approval is granted

**Reviewers** must:
- Review within agreed timeframes
- Provide specific, actionable feedback
- Distinguish between blocking concerns and suggestions
- Approve only code they would be comfortable maintaining

### 4.3 Review Boundaries

Reviewers may block merges for:
- Correctness issues
- Security vulnerabilities
- Architectural violations
- Missing tests for critical paths
- Unclear or unmaintainable code

Reviewers must not block merges for:
- Style preferences not covered by documented standards
- Alternative approaches that are not objectively better
- Scope expansion ("while you're in there...")

---

## 5. Version Control Standards

### 5.1 Commit Standards

Commits must be:
- Atomic: One logical change per commit
- Descriptive: Message explains what and why
- Complete: Code compiles and tests pass after each commit

Commit message format:
```
<type>: <short description>

<optional longer description>

<optional references to tickets>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

### 5.2 Branch Standards

Branch naming:
- Feature branches: `feature/<description>`
- Bug fixes: `fix/<description>`
- Releases: `release/<version>`

Branch hygiene:
- Branches must be short-lived
- Branches must be deleted after merge
- Long-running branches require explicit justification

### 5.3 Merge Standards

All merges to main/production branches:
- Require passing CI checks
- Require code review approval
- Must not break existing functionality
- Must include appropriate tests

Force-pushing to shared branches is forbidden.

---

## 6. Scope Boundaries

### 6.1 In Scope

- Code style and formatting standards
- Naming conventions
- Function and module design principles
- Error handling requirements
- Testing requirements
- Code review process
- Version control practices

### 6.2 Explicitly Out of Scope

- Specific architectural patterns (see Architecture Constitution)
- Security implementation details (see Security document)
- Deployment procedures (see Deployment document)
- Business logic rules (domain concern)

### 6.3 Intentionally Excluded

The following practices are explicitly rejected:

- Code ownership by individuals (all code is team-owned)
- Heroic individual efforts over sustainable team practices
- "Move fast and break things" mentality
- Untested code in production
- Documentation as optional afterthought

---

## 7. Implications for Implementation

### 7.1 Backend

- All API handlers must validate input before processing
- All database operations must go through typed repository layers
- All business logic must be testable in isolation from infrastructure
- Error responses must follow the standard structure
- Logging must include correlation IDs for request tracing

### 7.2 Frontend

- Components must be typed with explicit prop interfaces
- State management must be minimal and explicit
- API calls must handle loading, error, and success states
- User-facing text must be externalized for localization
- Accessibility standards must be followed for all interactive elements

### 7.3 Data

- All queries must be parameterized; string concatenation for queries is forbidden
- All schema changes must have corresponding migration scripts
- All migrations must be reversible or explicitly marked as one-way
- Data access must go through defined repository patterns

### 7.4 Infrastructure

- Build scripts must be deterministic and reproducible
- Configuration must be externalized and documented
- Dependencies must be pinned to specific versions
- Security updates must be applied promptly

### 7.5 AI / Agent

- Agent code must be isolated from main application code
- Agent queries must use parameterized interfaces
- Agent responses must be validated before presentation
- Agent error handling must not expose internal details

---

## 8. Explicit Anti-Patterns

The following patterns are forbidden. Code exhibiting these patterns must be corrected.

| Anti-Pattern | Violation |
|--------------|-----------|
| Using `any` type without documented justification | Violates type safety |
| Empty catch blocks | Violates error handling standards |
| Commented-out code committed to repository | Violates code hygiene |
| Functions exceeding 100 lines without justification | Violates function design |
| Tests that depend on execution order | Violates test independence |
| Merging without code review | Violates review requirements |
| Force-pushing to shared branches | Violates version control standards |
| Hardcoded secrets or credentials | Violates security principles |
| String concatenation for SQL queries | Violates data safety |
| Swallowing errors without logging | Violates observability |
| TODO comments without tracking tickets | Violates documentation standards |
| Single-letter variable names (except loop counters) | Violates naming conventions |
| Abbreviations that are not universally understood | Violates clarity principle |
| Self-approving and merging code changes | Violates review requirements |

---

## 9. Governance

These standards are binding on all engineers working on the WDI ERP system. Deviations require documented justification and team lead approval.

Standards may be amended through team consensus and documented change control. Individual preferences do not override documented standards.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 11:05:00 CST | Claude (acting CTO) | Initial pre-canonical draft authored under the established governance standard |
| v1.0 | 2026-01-23 11:05:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
