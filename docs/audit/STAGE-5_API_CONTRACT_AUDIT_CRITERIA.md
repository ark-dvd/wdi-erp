# STAGE 5 — API & Integration Contract Audit Criteria

**Version:** 1.0
**Date:** 2026-01-24
**Status:** Audit Criteria Definition (Phase 5.0)

---

## 1. Purpose of Stage 5

### 1.1 Why API Contracts Matter

An API contract is an implicit agreement between the server and its clients: given a request, the server responds in a predictable, documented manner. When contracts vary across endpoints, clients must implement special-case handling for each integration point, increasing fragility and error rates.

Stage 5 audits whether the WDI-ERP API enforces uniform behavior contracts across all endpoints. This ensures:

- Clients can apply consistent error handling logic across all API calls
- Response shapes are predictable without endpoint-specific parsing
- Error conditions are distinguishable by status code and response structure
- Mutations behave consistently regardless of entity type
- Retry and recovery logic can be implemented uniformly

### 1.2 Relationship Between UI and API Contracts

Stage 4 audited user-facing interaction contracts. Stage 5 audits the underlying API contracts that enable those interactions. The relationship is hierarchical:

| Layer | Contract Scope | Enforced By |
|-------|----------------|-------------|
| UI Contract | User-observable behavior | Stage 4 |
| API Contract | Machine-readable behavior | Stage 5 |

A UI contract violation may originate from an API contract violation. However, an API can be contract-compliant while the UI mishandles its responses. Stage 5 is concerned only with API-level behavior.

### 1.3 What This Stage Does NOT Audit

This stage does not audit:

- Business logic correctness (e.g., whether a calculation is accurate)
- Database schema design
- Performance or latency
- Code quality or architecture
- Feature completeness
- UI behavior (covered by Stage 4)

This stage audits:

- Response structure consistency
- Error semantics and status code usage
- List and query behavior uniformity
- Mutation response contracts
- Explicit behavior vs. silent behavior

---

## 2. Core Audit Principles

### 2.1 Determinism

Given identical request parameters, headers, and system state, the API must produce identical responses. No endpoint may introduce randomness or context-dependent variation in response structure.

**Audit test:** For any endpoint E, calling E with parameters P must yield a response with identical structure (though values may differ based on state).

### 2.2 Predictability

A client familiar with one endpoint's behavior must be able to predict the behavior of equivalent operations on other endpoints without prior exposure.

**Audit test:** Document response contract once per operation type (GET single, GET list, POST create, PUT update, DELETE), verify identical structure across all endpoints of that type.

### 2.3 Explicitness Over Inference

The API must never require clients to infer meaning from absence. All significant states must be explicitly represented in responses.

**Audit test:** For any state the client needs to know (success, failure, partial, pending), verify an explicit field or status code conveys that state.

### 2.4 No Silent Behavior

The API must never:

- Silently drop request parameters
- Silently modify data without acknowledgment
- Silently fail without error response
- Return success when operation did not complete
- Ignore validation failures

**Audit test:** Simulate conditions that could trigger silent behavior; verify explicit feedback in all cases.

### 2.5 Backward Safety

Changes to API behavior must not break existing clients unless versioned. Additions are safe; removals and semantic changes are breaking.

**Audit test:** For any API change, classify as breaking or non-breaking per Section 7 rules.

---

## 3. Response Structure Contracts

### 3.1 Success Response Shape

#### 3.1.1 Single Entity Responses

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-SINGLE-01 | Root structure | Success response for single entity must return the entity object directly, not wrapped in a container |
| R-SINGLE-02 | ID presence | Every entity response must include an `id` field at the root level |
| R-SINGLE-03 | Type consistency | Field types must be consistent across all responses for the same entity type |
| R-SINGLE-04 | Null representation | Absent optional fields must be represented as `null`, not omitted |
| R-SINGLE-05 | Date format | All date/datetime fields must use ISO 8601 format |

#### 3.1.2 List Responses

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-LIST-01 | Root structure | List responses must return an array directly OR a consistent wrapper object |
| R-LIST-02 | Wrapper consistency | If wrapper is used, wrapper shape must be identical across all list endpoints |
| R-LIST-03 | Empty list | Empty results must return empty array `[]`, not `null` or error |
| R-LIST-04 | Item shape | Each item in list must conform to single entity shape for that type |

#### 3.1.3 Mutation Responses

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-MUT-01 | Create response | Successful create must return the created entity with its assigned ID |
| R-MUT-02 | Update response | Successful update must return the updated entity reflecting all changes |
| R-MUT-03 | Delete response | Successful delete must return confirmation (entity, ID, or explicit success indicator) |
| R-MUT-04 | No empty success | 200/201 responses must include a response body; empty success is forbidden |

### 3.2 Error Response Shape

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-ERR-01 | Error structure | All error responses must include an `error` field containing the error message |
| R-ERR-02 | Error consistency | Error response structure must be identical across all endpoints |
| R-ERR-03 | Error detail | Validation errors should include a `details` or `fields` object mapping field names to errors |
| R-ERR-04 | No stack traces | Production error responses must never include stack traces or internal paths |
| R-ERR-05 | Human-readable | Error messages must be human-readable, not internal codes only |

### 3.3 HTTP Status Code Usage

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| R-HTTP-01 | 200 usage | 200 OK for successful GET, PUT, PATCH that returns data |
| R-HTTP-02 | 201 usage | 201 Created for successful POST that creates a resource |
| R-HTTP-03 | 204 usage | 204 No Content only when response body is intentionally empty |
| R-HTTP-04 | 400 usage | 400 Bad Request for validation failures and malformed requests |
| R-HTTP-05 | 401 usage | 401 Unauthorized for missing or invalid authentication |
| R-HTTP-06 | 403 usage | 403 Forbidden for valid auth but insufficient permissions |
| R-HTTP-07 | 404 usage | 404 Not Found for resources that do not exist |
| R-HTTP-08 | 409 usage | 409 Conflict for duplicate/uniqueness violations |
| R-HTTP-09 | 500 usage | 500 Internal Server Error for unhandled server exceptions |
| R-HTTP-10 | Consistency | Same condition must produce same status code across all endpoints |

---

## 4. Error Semantics

### 4.1 Validation Errors

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| E-VAL-01 | Status code | Validation failures must return 400 Bad Request |
| E-VAL-02 | Field identification | Response must identify which field(s) failed validation |
| E-VAL-03 | Multiple errors | All validation errors should be returned together, not one at a time |
| E-VAL-04 | Error message | Each field error must include a human-readable message |
| E-VAL-05 | No silent rejection | Invalid fields must not be silently ignored; validation must fail explicitly |

### 4.2 Authorization Errors

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| E-AUTH-01 | 401 semantics | 401 must mean "not authenticated" — no valid session/token |
| E-AUTH-02 | 403 semantics | 403 must mean "authenticated but not authorized for this action" |
| E-AUTH-03 | No 404 masking | Authorization failures must not be masked as 404 (leaking existence is acceptable for internal APIs) |
| E-AUTH-04 | Consistent message | Authorization denial message format must be consistent across endpoints |
| E-AUTH-05 | Role indication | 403 response may indicate required permission/role if not security-sensitive |

### 4.3 Not Found Errors

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| E-404-01 | Status code | Non-existent resource requests must return 404 |
| E-404-02 | Message | Response must indicate the resource was not found |
| E-404-03 | Consistency | 404 behavior must be identical across all single-resource endpoints |
| E-404-04 | No null entity | GET for missing resource must not return 200 with null body |

### 4.4 Conflict Errors

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| E-CONF-01 | Status code | Uniqueness violations must return 409 Conflict |
| E-CONF-02 | Field identification | Response should identify which field(s) caused the conflict |
| E-CONF-03 | Existing value | Response may include the conflicting existing value/ID |
| E-CONF-04 | Consistency | Duplicate handling must be consistent across all create/update endpoints |

### 4.5 Server Errors

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| E-500-01 | Status code | Unhandled exceptions must return 500 |
| E-500-02 | Safe message | Response must include generic error message, not exception details |
| E-500-03 | Logging | Server errors must be logged server-side (not audited, but required) |
| E-500-04 | No 200 on failure | Server failures must never return 200 status |

---

## 5. List / Query Behavior

### 5.1 Pagination Contract

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| L-PAGE-01 | Pagination support | If pagination is supported, mechanism must be consistent across all list endpoints |
| L-PAGE-02 | Default behavior | Unpaginated requests must either return all results OR apply a documented default limit |
| L-PAGE-03 | Total count | Paginated responses should include total count if feasible |
| L-PAGE-04 | Page parameters | Pagination parameters (page, limit, offset, cursor) must use consistent naming |
| L-PAGE-05 | Out of bounds | Requesting beyond available pages must return empty array, not error |

### 5.2 Sorting Contract

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| L-SORT-01 | Sort support | If sorting is supported, parameter naming must be consistent across endpoints |
| L-SORT-02 | Default sort | Each list endpoint must have a defined default sort order |
| L-SORT-03 | Sort direction | Sort direction (asc/desc) must use consistent representation |
| L-SORT-04 | Invalid sort field | Invalid sort field must return 400, not silently ignore |
| L-SORT-05 | Stable sort | Sort must be stable (consistent ordering of equal values) |

### 5.3 Filtering Contract

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| L-FILT-01 | Filter parameters | Filter parameter naming conventions must be consistent |
| L-FILT-02 | Invalid filter | Invalid filter values must return 400, not silently ignore |
| L-FILT-03 | Empty filter | Empty/missing filter must return unfiltered results |
| L-FILT-04 | Case sensitivity | Text filter case sensitivity must be consistent and documented |
| L-FILT-05 | Partial match | Partial match behavior (contains vs exact) must be consistent |

### 5.4 Empty Result Semantics

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| L-EMPTY-01 | Status code | Empty results must return 200, not 404 |
| L-EMPTY-02 | Body | Empty results must return empty array `[]` |
| L-EMPTY-03 | Metadata | If pagination metadata is included, it must still be present for empty results |
| L-EMPTY-04 | Consistency | Empty result handling must be identical across all list endpoints |

---

## 6. Mutation Semantics

### 6.1 Create Operations

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| M-CRE-01 | Status code | Successful create must return 201 Created |
| M-CRE-02 | Response body | Response must include the created entity with its ID |
| M-CRE-03 | Idempotency | Create operations are inherently non-idempotent; duplicate creates must fail or be explicitly handled |
| M-CRE-04 | Required fields | Missing required fields must return 400 with field identification |
| M-CRE-05 | Server-assigned fields | Server-assigned fields (id, timestamps) must be included in response |

### 6.2 Update Operations

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| M-UPD-01 | Status code | Successful update must return 200 OK |
| M-UPD-02 | Response body | Response must include the updated entity reflecting all changes |
| M-UPD-03 | Missing resource | Update to non-existent resource must return 404 |
| M-UPD-04 | Partial vs full | Whether endpoint supports partial (PATCH) or full (PUT) update must be consistent |
| M-UPD-05 | Concurrency | If optimistic concurrency is used, conflict must return 409 |

### 6.3 Delete Operations

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| M-DEL-01 | Status code | Successful delete must return 200 or 204 consistently |
| M-DEL-02 | Missing resource | Delete of non-existent resource must return 404 OR 200 (idempotent) consistently |
| M-DEL-03 | Cascade behavior | If delete cascades, behavior must be documented and consistent |
| M-DEL-04 | Soft delete | If soft delete is used, behavior must be consistent across entity types |
| M-DEL-05 | Referenced entities | Delete of referenced entity must fail with 409 or cascade; silent orphaning forbidden |

### 6.4 Idempotency Expectations

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| M-IDEM-01 | GET idempotency | GET requests must be idempotent and safe (no side effects) |
| M-IDEM-02 | PUT idempotency | PUT requests should be idempotent (same request = same result) |
| M-IDEM-03 | DELETE idempotency | DELETE should be idempotent (deleting already-deleted = success or 404 consistently) |
| M-IDEM-04 | POST non-idempotency | POST create is not expected to be idempotent unless explicitly designed |
| M-IDEM-05 | Retry safety | Clients must be able to safely retry failed requests per idempotency expectations |

### 6.5 Partial Failure Rules

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| M-PART-01 | Batch operations | If batch operations exist, partial failure handling must be explicitly documented |
| M-PART-02 | All-or-nothing | Single-entity mutations must be atomic; partial application forbidden |
| M-PART-03 | Transaction rollback | Failed mutations must not leave partial state |
| M-PART-04 | Error reporting | Batch failures must identify which items succeeded and which failed |

---

## 7. Versioning & Breaking Change Rules

### 7.1 Breaking Changes

The following constitute breaking changes and require version coordination:

| Change Type | Classification | Reason |
|-------------|----------------|--------|
| Removing a response field | Breaking | Clients may depend on field presence |
| Changing a field's type | Breaking | Clients parse based on expected type |
| Renaming a field | Breaking | Clients reference by name |
| Changing status code semantics | Breaking | Clients branch on status codes |
| Adding required request field | Breaking | Existing requests will fail |
| Removing an endpoint | Breaking | Clients will receive 404 |
| Changing URL structure | Breaking | Clients use hardcoded paths |
| Changing error response shape | Breaking | Error handling will fail |

### 7.2 Non-Breaking Changes

The following are allowed without version bump:

| Change Type | Classification | Reason |
|-------------|----------------|--------|
| Adding optional response field | Non-breaking | Clients should ignore unknown fields |
| Adding optional request parameter | Non-breaking | Existing requests still valid |
| Adding new endpoint | Non-breaking | Does not affect existing integrations |
| Relaxing validation | Non-breaking | Previously valid requests remain valid |
| Improving error messages | Non-breaking | Semantics unchanged |
| Adding new status code for new condition | Non-breaking | Existing conditions unchanged |

### 7.3 Deprecation Rules

| Criterion ID | Criterion | Requirement |
|--------------|-----------|-------------|
| V-DEP-01 | Deprecation signal | Deprecated endpoints/fields should be signaled via response header or documentation |
| V-DEP-02 | Grace period | Deprecated features must remain functional for documented period |
| V-DEP-03 | Replacement indication | Deprecation notice should indicate replacement if available |
| V-DEP-04 | No silent removal | Features must not be removed without prior deprecation |

---

## 8. Audit Gap Classification Rules

### 8.1 Critical Gap

A gap is **Critical** when any of the following conditions exist:

| Condition | Definition |
|-----------|------------|
| Silent data loss | Mutation succeeds but data is lost or corrupted silently |
| Silent failure | Operation fails with 200 status or no response |
| Auth bypass | 403/401 not returned for unauthorized access |
| Data exposure | Sensitive data returned without authorization check |
| Inconsistent state | Operation leaves system in inconsistent state |

**Response requirement:** Critical gaps must be addressed before Stage 5 completion.

### 8.2 Major Gap

A gap is **Major** when any of the following conditions exist:

| Condition | Definition |
|-----------|------------|
| Response shape inconsistency | Same operation type returns different structures across endpoints |
| Status code misuse | Wrong status code for condition (e.g., 200 for not found) |
| Missing error detail | Error response lacks field identification or useful message |
| Undocumented behavior | Endpoint behavior not predictable from conventions |
| Validation inconsistency | Same validation rule applied differently across endpoints |

**Response requirement:** Major gaps should be addressed before Stage 5 completion or documented with justification for deferral.

### 8.3 Minor Gap

A gap is **Minor** when any of the following conditions exist:

| Condition | Definition |
|-----------|------------|
| Message wording variation | Error messages differ but meaning is clear |
| Extra fields | Response includes undocumented but harmless extra fields |
| Ordering variation | List default ordering differs but is deterministic |
| Null vs omitted | Optional field represented as null in some endpoints, omitted in others |

**Response requirement:** Minor gaps should be documented. Remediation is optional for Stage 5 completion.

---

## 9. Audit Evidence Requirements

### 9.1 Valid Evidence

The following constitute valid audit evidence:

| Evidence Type | Description |
|---------------|-------------|
| Response inspection | Actual API response body and status code |
| Handler code inspection | Server-side code showing response construction |
| Error handling inspection | Code showing error response construction |
| Status code assignment | Code showing which status codes are returned for which conditions |
| Schema comparison | Comparison of response shapes across endpoints |

### 9.2 Invalid Evidence

The following do not constitute valid audit evidence:

| Evidence Type | Reason for Exclusion |
|---------------|----------------------|
| Documentation claims | Documentation may be outdated; behavior must be verified |
| Client-side handling | Client behavior does not prove API behavior |
| Logs without response | Logs showing request without response are incomplete |
| Performance metrics | Out of scope for contract compliance |
| Test coverage | Tests passing does not prove contract compliance |

### 9.3 Audit Methodology

The audit must follow this methodology:

1. **Endpoint Inventory:** Catalog all API endpoints by operation type
2. **Response Sampling:** Capture success and error responses for each endpoint
3. **Shape Comparison:** Compare response structures across endpoints of same type
4. **Error Simulation:** Trigger each error condition (validation, 404, 403, 409, 500)
5. **Classification:** Classify each deviation per Section 8
6. **Documentation:** Document each gap with evidence

---

## Appendix A: Applicable API Categories

Stage 5 audits apply to the following API categories:

| Category | Description | Key Contracts |
|----------|-------------|---------------|
| Entity CRUD | Create, read, update, delete for core entities | Response shape, status codes, error handling |
| List/Search | Collection retrieval with filtering/sorting | Pagination, empty results, filter handling |
| Relationship | Managing entity relationships | Reference validation, cascade behavior |
| Import/Batch | Bulk data operations | Partial failure, validation reporting |
| Auth | Authentication and session management | 401/403 semantics, token handling |
| File/Upload | File handling endpoints | Upload response, error handling |

---

## Appendix B: Audit Phases

Stage 5 proceeds in the following phases:

| Phase | Name | Deliverable |
|-------|------|-------------|
| 5.0 | Criteria Definition | This document |
| 5.1 | Endpoint Inventory | Catalog of all API endpoints by type |
| 5.2 | Contract Verification | Response sampling and comparison |
| 5.3 | Gap Identification | Gap report per Section 8/9 format |
| 5.4 | Remediation | Implementation of fixes (if gaps found) |
| 5.5 | Re-Audit | Verification of remediation |

Phase 5.1 may not begin until Phase 5.0 is approved.

---

**End of Stage 5 Audit Criteria Document**
