# STAGE 6 — Agent & Production Readiness Audit Criteria (Maybach Grade)

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Criteria Definition
**Branch:** stage1-auth-policy-alignment
**Prerequisites:** Stages 1–5 PASS (including Stage 5.3b Maybach API Contract)

---

## 1. Purpose of Stage 6

Stage 6 determines whether the WDI-ERP system is ready for unsupervised production operation and whether the Agent is a reliable operational actor—not a demo feature.

This stage validates:

1. **Trust**: Can a human operator trust the Agent's answers without manual verification?
2. **Reliability**: Does the Agent behave consistently under normal and failure conditions?
3. **Day-2 Operations**: After deployment, can humans and the Agent together explain system state, diagnose issues, and identify gaps?

Stage 6 is not about capabilities. It is about accountability. The Agent must know what it knows, know what it does not know, and never pretend otherwise.

A system that passes Stage 6 can be handed to operations staff who did not build it.

---

## 2. Core Principles

### 2.1 No Hallucination

The Agent must never generate information that does not exist in the system. If the Agent says "Project X has 3 active contacts," there must be exactly 3 active contacts for Project X in the database. If the Agent cannot verify, it must not answer.

### 2.2 Explicit Data Presence vs. Absence

The Agent must distinguish between:
- **Data exists and was retrieved** — "There are 5 employees in the Engineering department."
- **Data does not exist** — "There are no employees in the Engineering department."
- **Module has no data at all** — "The HR module contains no employee records."
- **Data is inaccessible** — "Employee data exists but is not accessible with current permissions."

These are four different states. Conflating them is a failure.

### 2.3 Explainability Over Silence

When the Agent cannot answer, it must explain why. Silence or vague responses ("I'm not sure") are not acceptable. The Agent must identify the specific barrier:
- Missing data
- Missing module
- Permission restriction
- Query failure
- Ambiguous request

### 2.4 Deterministic Behavior Under Failure

When a query fails, the Agent must:
1. Recognize the failure
2. Report it explicitly
3. Not attempt to guess or approximate
4. Not treat partial data as complete data

The same failure must produce the same response every time.

### 2.5 Agent is Accountable, Not Decorative

The Agent is not a convenience layer. It is an operational component. Its answers may drive business decisions. Therefore:
- Every answer must be auditable
- Every answer must trace to source data
- The Agent must refuse to answer rather than risk being wrong

---

## 3. Audit Domains & Criteria

### 3.1 Agent Coverage & Access

#### 3.1.1 Module Coverage

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-COV-01 | Agent can query all business modules | Agent successfully retrieves data from: Contacts, Projects, HR, Organizations, Vehicles, Equipment, Events, Reviews, Users |
| A-COV-02 | Agent reports module absence correctly | When queried about a non-existent module, Agent responds with explicit "module does not exist" |
| A-COV-03 | Agent reports empty module correctly | When queried about an existing module with no records, Agent responds with explicit "no records in module" |

#### 3.1.2 Data State Distinction

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-COV-04 | Agent distinguishes "no records" from "module not used" | Agent provides different responses for empty table vs. module never initialized |
| A-COV-05 | Agent distinguishes "no access" from "no data" | When permissions block access, Agent explicitly states permission restriction, not data absence |
| A-COV-06 | Agent reports partial access correctly | If Agent can access some fields but not others, it reports what it can and cannot access |

#### 3.1.3 Query Boundaries

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-COV-07 | Agent does not claim data beyond query scope | If asked about "projects in 2024," Agent does not include 2023 or 2025 data |
| A-COV-08 | Agent reports when query scope exceeds available data | If asked about data that predates system deployment, Agent states "no data for that period" |

---

### 3.2 Agent Answer Correctness & Honesty

#### 3.2.1 Data Grounding

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-COR-01 | Every factual claim traces to database record | Agent's answer about counts, names, dates, or states matches actual database query result |
| A-COR-02 | Agent does not interpolate missing values | If a field is NULL, Agent says "not recorded" not a guessed value |
| A-COR-03 | Agent does not aggregate without explicit data | "Average salary" must be computed from actual records, not estimated |

#### 3.2.2 Source Attribution

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-COR-04 | Agent can identify data source for any answer | When asked "where did you get this?", Agent can name table/field/query |
| A-COR-05 | Agent distinguishes live data from cached data | If using cached data, Agent states cache age or staleness risk |
| A-COR-06 | Agent does not mix data sources silently | If combining data from multiple modules, Agent explicitly states the combination |

#### 3.2.3 Uncertainty Handling

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-COR-07 | Agent expresses uncertainty when data is ambiguous | If query could match multiple interpretations, Agent asks for clarification or lists possibilities |
| A-COR-08 | Agent refuses to answer rather than guess | When confidence is low, Agent says "I cannot determine this from available data" |
| A-COR-09 | Agent does not use hedging language to mask gaps | "Probably," "likely," "around" are not acceptable for factual queries |

---

### 3.3 Data Awareness & Gap Transparency

#### 3.3.1 Missing Data Detection

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-GAP-01 | Agent identifies records with missing mandatory fields | Agent can list contacts without phone numbers, projects without managers, etc. |
| A-GAP-02 | Agent quantifies data gaps | Agent can say "15 of 47 employees have no department assigned" |
| A-GAP-03 | Agent prioritizes gaps by business impact | Agent can distinguish critical gaps from minor gaps |

#### 3.3.2 Completeness Queries

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-GAP-04 | Agent can answer "What is missing to complete X?" | For any entity, Agent lists unfilled required fields |
| A-GAP-05 | Agent can answer "Which records are incomplete?" | Agent can filter by completeness status |
| A-GAP-06 | Agent does not report partial records as complete | Agent never says "data is complete" when required fields are NULL |

---

### 3.4 Operational Observability (Human + Agent)

#### 3.4.1 Event Explanation

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-OBS-01 | Agent can explain any business event from audit logs | Given an event ID or timestamp, Agent describes what happened |
| A-OBS-02 | Agent can attribute actions to users | Agent can identify who performed an action, not just that it happened |
| A-OBS-03 | Agent can timeline events for an entity | Agent can list all changes to a contact/project/employee in chronological order |

#### 3.4.2 Audit Log Usability

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-OBS-04 | Audit logs contain sufficient context for explanation | Logs include entity name, not just ID; action description, not just type code |
| A-OBS-05 | Agent can summarize audit log patterns | Agent can identify "most active module," "most changed record," "busiest user" |
| A-OBS-06 | Agent can filter audit logs meaningfully | Agent can retrieve logs by user, by module, by date range, by action type |

#### 3.4.3 Human-Agent Parity

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-OBS-07 | Anything Agent can query, human can query via UI | No Agent-only data access paths |
| A-OBS-08 | Anything human sees in UI, Agent can explain | Agent can describe what a dashboard shows and why |

---

### 3.5 Failure Modes & Recovery Awareness

#### 3.5.1 Failure Recognition

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-FAIL-01 | Agent recognizes query failures | When database query fails, Agent reports failure, not empty result |
| A-FAIL-02 | Agent recognizes timeout vs. error vs. empty | Agent distinguishes "query timed out," "query failed," "query returned no rows" |
| A-FAIL-03 | Agent recognizes partial failures | If multi-step query partially succeeds, Agent reports which parts failed |

#### 3.5.2 Failure Reporting

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-FAIL-04 | Agent reports failure cause when known | "Database connection refused" not just "something went wrong" |
| A-FAIL-05 | Agent does not retry silently and report success | If retry succeeded, Agent mentions that retry was needed |
| A-FAIL-06 | Agent preserves failure context for debugging | Failure reports include timestamp, query attempted, error received |

#### 3.5.3 State After Failure

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-FAIL-07 | Agent can describe system state after failure | "The contact was created but the project link failed" |
| A-FAIL-08 | Agent does not assume rollback occurred | Unless transaction rollback is confirmed, Agent does not claim clean state |
| A-FAIL-09 | Agent can identify orphaned or inconsistent data | Agent can find records that reference non-existent records |

---

### 3.6 Environment Parity Awareness

#### 3.6.1 Behavior Consistency

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-ENV-01 | Agent behavior identical in staging and production | Same query produces same response structure in both environments |
| A-ENV-02 | No environment-specific hardcoded logic | No `if (env === 'production')` branching in Agent code |
| A-ENV-03 | Agent reports which environment it is operating in | When asked, Agent can state current environment |

#### 3.6.2 Data Sensitivity

| Criterion ID | Criterion | Pass Condition |
|--------------|-----------|----------------|
| A-ENV-04 | Agent does not expose environment secrets | API keys, connection strings, internal URLs are never in Agent responses |
| A-ENV-05 | Agent behavior does not leak environment info | Response times, error messages do not reveal infrastructure details |

---

## 4. Gap Severity Classification

### 4.1 Critical (Blocks Production Release)

| Code | Description | Example |
|------|-------------|---------|
| CRIT-01 | Agent hallucination | Agent reports 10 projects when 7 exist |
| CRIT-02 | Silent failure | Query fails but Agent returns plausible-looking data |
| CRIT-03 | False confidence | Agent says "definitely" when data is ambiguous |
| CRIT-04 | Data leakage | Agent exposes data user should not access |
| CRIT-05 | Fabricated attribution | Agent claims user X did something they did not do |

### 4.2 Major (Must Fix Before Production)

| Code | Description | Example |
|------|-------------|---------|
| MAJ-01 | Incomplete module coverage | Agent cannot query one of the 9 core modules |
| MAJ-02 | Unclear failure explanation | Agent says "error occurred" without specifics |
| MAJ-03 | Missing data/no-data confusion | Agent cannot distinguish empty from non-existent |
| MAJ-04 | Untraceable answers | Agent provides number but cannot cite source |
| MAJ-05 | Partial failure treated as success | Transaction half-completed, Agent reports success |

### 4.3 Minor (Should Fix, Does Not Block)

| Code | Description | Example |
|------|-------------|---------|
| MIN-01 | Awkward phrasing | Grammatically correct but confusing response |
| MIN-02 | Excessive verbosity | Agent over-explains simple queries |
| MIN-03 | Inconsistent terminology | Uses "worker" in one response, "employee" in another |
| MIN-04 | Missing convenience queries | Cannot answer "top 5" but can answer "all sorted" |

---

## 5. Evidence Requirements

### 5.1 Valid Evidence for PASS

| Evidence Type | Description |
|---------------|-------------|
| Query-Response Pairs | Documented input query and exact Agent response, matched against database state |
| Database Snapshots | Timestamped database state proving Agent answer correctness |
| Error Injection Tests | Deliberate failures with documented Agent response |
| Permission Matrix Tests | Queries from different roles with documented access results |
| Audit Log Traces | Agent explanations matched against actual audit log entries |

### 5.2 Invalid Evidence (Not Acceptable)

| Invalid Evidence | Why Not Acceptable |
|------------------|-------------------|
| "It seems to work" | Subjective, not verifiable |
| "No complaints from users" | Absence of evidence is not evidence of absence |
| "Worked in demo" | Demo conditions are not production conditions |
| "Code review approved" | Code correctness does not guarantee runtime correctness |
| "Similar to tested case" | Each case must be independently verified |
| Developer assertion | Developers are not auditors |

### 5.3 Evidence Documentation Format

Each criterion must have:
1. Criterion ID
2. Test performed (exact query or action)
3. Expected result
4. Actual result
5. Database state at time of test (or audit log reference)
6. PASS/FAIL determination
7. If FAIL: gap severity and remediation requirement

---

## 6. Stage 6 Phases Definition

### 6.0 Criteria Definition (This Document)

**Deliverable:** `docs/audit/STAGE-6_AGENT_AND_PRODUCTION_READINESS_AUDIT_CRITERIA.md`

**Purpose:** Define what will be audited and how.

**Exit Condition:** Document reviewed and accepted.

---

### 6.1 Audit

**Deliverable:** `docs/audit/STAGE-6_1_AUDIT_RESULTS.md`

**Purpose:** Execute all criteria checks against current system state.

**Activities:**
1. For each criterion in Section 3, execute test
2. Document evidence per Section 5
3. Record PASS/FAIL per criterion
4. Calculate coverage: X of Y criteria passed

**Exit Condition:** All criteria tested, results documented.

---

### 6.2 Gap Identification

**Deliverable:** `docs/audit/STAGE-6_2_GAP_IDENTIFICATION.md`

**Purpose:** Catalog all failures with severity and root cause.

**Activities:**
1. List all FAIL criteria
2. Assign severity (Critical/Major/Minor) per Section 4
3. Identify root cause for each gap
4. Group related gaps by underlying issue

**Exit Condition:** All gaps cataloged, no unclassified failures.

---

### 6.3 Remediation

**Deliverable:** `docs/audit/STAGE-6_3_REMEDIATION.md`

**Purpose:** Fix all Critical and Major gaps.

**Activities:**
1. For each Critical gap: implement fix, document change
2. For each Major gap: implement fix, document change
3. Minor gaps: document decision (fix or defer with justification)

**Exit Condition:** All Critical and Major gaps resolved. Minor gaps dispositioned.

---

### 6.4 Re-Audit

**Deliverable:** `docs/audit/STAGE-6_4_REAUDIT.md`

**Purpose:** Verify remediation was effective.

**Activities:**
1. Re-execute all previously failed criteria
2. Document new evidence
3. Confirm PASS or identify remaining gaps

**Exit Condition:** All Critical and Major criteria PASS.

---

### 6.5 PASS / FAIL Rules

#### Stage 6 PASS Conditions (ALL must be true)

1. Zero Critical gaps remain
2. Zero Major gaps remain
3. All criteria in domains 3.1–3.5 have PASS status
4. Domain 3.6 (Environment Parity) has PASS status
5. Evidence documentation complete per Section 5

#### Stage 6 FAIL Conditions (ANY triggers FAIL)

1. Any Critical gap unresolved
2. Any Major gap unresolved
3. Any criterion tested but evidence incomplete
4. Any criterion not tested

#### Conditional PASS

Not permitted. Stage 6 is binary. The system is production-ready or it is not.

---

## 7. Relationship to Prior Stages

| Stage | What It Validated | Stage 6 Dependency |
|-------|-------------------|-------------------|
| Stage 1 | Authorization policies | Agent must respect same policies |
| Stage 2 | Auth implementation | Agent queries use authenticated sessions |
| Stage 3 | Audit logging | Agent explanations use audit logs |
| Stage 4 | UI interaction contracts | Agent answers must match what UI shows |
| Stage 5 | API contracts | Agent uses compliant API responses |

Stage 6 does not re-audit Stages 1–5. It assumes they PASS and validates the Agent operates correctly within those constraints.

---

## 8. Production Release Gate

Stage 6 PASS is a mandatory gate for production release.

A system that fails Stage 6:
- Cannot be deployed to production
- Cannot be labeled "production-ready"
- Cannot be handed to operations staff

There are no exceptions. There are no waivers. The criteria exist because the risks exist.

---

**Document Status:** CRITERIA DEFINITION COMPLETE

**Next Phase:** Stage 6.1 Audit (execution of criteria)

---

**Author:** Claude Code
**Date:** 2026-01-24
