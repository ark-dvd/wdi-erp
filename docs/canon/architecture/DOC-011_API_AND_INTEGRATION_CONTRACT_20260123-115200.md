---
Canonical Document ID: DOC-011
Document Title: API & Integration Contract
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 11:52:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 11:52:00 CST
Last Updated: 2026-01-23 11:52:00 CST
Current Version: v1.0
---

# DOC-011 — API & Integration Contract

---

## 1. Purpose

This document defines the binding contract for all API interactions within and with the WDI ERP system.

APIs are promises. When an API is published, consumers depend on it. Breaking that promise breaks their systems. This document establishes the discipline required to make and keep API promises.

---

## 2. API Design Principles

### 2.1 Explicit Over Clever

API design favors explicit, predictable behavior over clever shortcuts. An API that requires reading implementation code to understand is poorly designed.

Consumers should be able to predict API behavior from documentation alone. Surprises indicate design failures.

### 2.2 Consistency Over Convenience

All APIs follow consistent patterns. A consumer who learns one endpoint should be able to predict the behavior of others.

Consistency requirements:
- Naming conventions are uniform
- Error formats are identical
- Pagination works the same way everywhere
- Authentication and authorization follow the same patterns

Convenience for one endpoint at the cost of consistency is forbidden.

### 2.3 Backward Compatibility by Default

Published APIs remain backward compatible. Consumers must not be forced to change their code because of API updates.

Backward compatibility means:
- Existing endpoints continue to work
- Existing fields retain their meaning
- Existing error codes retain their semantics
- New features are additive, not replacement

Breaking changes require a new API version.

### 2.4 Consumer-Centric Design

APIs are designed for consumers, not for implementation convenience. The internal structure of the system should not leak into API design.

Consumer needs drive:
- What data is exposed
- How data is structured
- What operations are available
- How errors are communicated

Implementation details are hidden behind the API contract.

---

## 3. API Standards

### 3.1 Protocol

All APIs use HTTPS. Unencrypted HTTP is forbidden for any endpoint.

RESTful conventions are followed:
- Resources are nouns
- HTTP methods indicate operations (GET, POST, PUT, PATCH, DELETE)
- Status codes indicate outcomes
- URLs are hierarchical and predictable

### 3.2 Serialization

JSON is the only serialization format. No XML. No form encoding for data payloads. No protocol buffers for HTTP APIs.

JSON requirements:
- UTF-8 encoding
- ISO 8601 for dates and timestamps (with timezone)
- Consistent casing (camelCase for field names)
- No comments or trailing commas

### 3.3 URL Structure

URLs follow a consistent structure:

```
/api/v{version}/{resource}
/api/v{version}/{resource}/{id}
/api/v{version}/{resource}/{id}/{sub-resource}
```

URL requirements:
- Lowercase only
- Hyphens for multi-word resources (not underscores)
- Plural nouns for collections
- No verbs in URLs (use HTTP methods)
- No trailing slashes

### 3.4 HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resource(s) | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource entirely | Yes | No |
| PATCH | Partial update | Yes | No |
| DELETE | Remove resource | Yes | No |

Method semantics must be respected. GET must never modify data. POST must not be used for retrieval.

### 3.5 Status Codes

Status codes communicate outcome categories:

| Range | Meaning | Examples |
|-------|---------|----------|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 4xx | Client error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | Server error | 500 Internal Server Error, 503 Service Unavailable |

Status code requirements:
- Use the most specific appropriate code
- 200 for successful GET, PUT, PATCH
- 201 for successful POST that creates a resource
- 204 for successful DELETE or operations with no response body
- 400 for malformed requests
- 401 for authentication failures
- 403 for authorization failures
- 404 for resources that don't exist
- 500 only for unexpected server errors

---

## 4. Versioning

### 4.1 All APIs Are Versioned

Every API endpoint includes a version identifier. Unversioned APIs are forbidden.

Version appears in the URL path: `/api/v1/...`

### 4.2 Version Semantics

Major version increments indicate breaking changes. Within a major version, all changes are backward compatible.

Breaking changes include:
- Removing endpoints
- Removing fields from responses
- Changing field types or semantics
- Adding required fields to requests
- Changing error code meanings

Non-breaking changes include:
- Adding new endpoints
- Adding optional fields to requests
- Adding fields to responses
- Adding new error codes

### 4.3 Deprecation Process

Old versions are deprecated, not removed abruptly.

Deprecation process:
1. Announce deprecation with timeline (minimum 6 months for external APIs)
2. Add deprecation warnings to responses
3. Monitor usage of deprecated version
4. Communicate with known consumers
5. Remove only after deprecation period and usage drops to acceptable level

Emergency security deprecation may accelerate this timeline with explicit communication.

### 4.4 Version Support

At minimum, two versions are supported simultaneously:
- Current version (active development)
- Previous version (maintenance only)

Older versions may be maintained longer based on consumer needs and support commitments.

---

## 5. Request Standards

### 5.1 Request Headers

Required headers:
- `Content-Type: application/json` for requests with body
- `Authorization` for authenticated endpoints

Recommended headers:
- `Accept: application/json`
- `X-Request-ID` for correlation (generated by client)

### 5.2 Request Body

Request bodies must be valid JSON objects. Arrays at the root level are forbidden for mutation operations.

Request validation:
- Unknown fields are ignored (forward compatibility)
- Required fields must be present
- Field types must match specification
- Field values must pass validation rules

### 5.3 Query Parameters

Query parameters are used for:
- Filtering: `?status=active`
- Sorting: `?sort=createdAt:desc`
- Pagination: `?cursor=xyz&limit=20`
- Field selection: `?fields=id,name,status`

Query parameter conventions:
- camelCase names
- Comma-separated for multiple values
- Colon-separated for key:value pairs

---

## 6. Response Standards

### 6.1 Response Structure

Successful responses return the requested resource or collection directly:

Single resource:
```json
{
  "id": "...",
  "field": "value",
  ...
}
```

Collection:
```json
{
  "data": [...],
  "pagination": {
    "cursor": "...",
    "hasMore": true
  }
}
```

### 6.2 Pagination

All collection endpoints support pagination. Unbounded result sets are forbidden.

Pagination uses cursor-based approach:
- `cursor`: Opaque string for position
- `limit`: Maximum items to return (default and maximum defined per endpoint)
- `hasMore`: Boolean indicating additional results exist

Offset-based pagination is forbidden for large datasets due to performance and consistency issues.

### 6.3 Filtering and Sorting

Collection endpoints support filtering by common fields. Filter behavior:
- Exact match by default
- Operators for ranges where appropriate
- Multiple filters combine with AND logic

Sorting:
- Default sort order is defined and documented
- Sort parameter accepts field and direction
- Multi-field sorting where appropriate

---

## 7. Error Standards

### 7.1 Error Response Structure

All errors return a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "context": {
      "field": "additional context"
    }
  }
}
```

Error structure requirements:
- `code`: Machine-readable error identifier (UPPER_SNAKE_CASE)
- `message`: Human-readable explanation suitable for logging
- `context`: Optional additional details for debugging

### 7.2 Error Codes

Error codes are stable identifiers that consumers can depend on. Error codes must:
- Be documented
- Remain consistent across versions
- Be specific enough to be actionable
- Not expose internal implementation details

Standard error codes:
- `VALIDATION_ERROR`: Request failed validation
- `AUTHENTICATION_REQUIRED`: No valid credentials provided
- `PERMISSION_DENIED`: Authenticated but not authorized
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `CONFLICT`: Operation conflicts with current state
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Unexpected server error

### 7.3 Validation Errors

Validation errors include field-level details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "context": {
      "fields": {
        "email": "Invalid email format",
        "startDate": "Must be in the future"
      }
    }
  }
}
```

---

## 8. Authentication & Authorization

### 8.1 Authentication

All endpoints except health checks require authentication. Authentication is verified before any processing.

Authentication failure returns:
- Status: 401 Unauthorized
- Error code: `AUTHENTICATION_REQUIRED`

### 8.2 Authorization

After authentication, authorization is checked. The same authorization model applies to all API consumers, including the AI agent.

Authorization failure returns:
- Status: 403 Forbidden
- Error code: `PERMISSION_DENIED`

Authorization errors must not leak information about resource existence. A user without permission to view a resource receives 403, not 404.

### 8.3 Rate Limiting

Rate limits apply to all API consumers. Rate limits are:
- Per-user or per-API-key
- Documented in API specification
- Communicated via response headers

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when window resets

Rate limit exceeded returns:
- Status: 429 Too Many Requests
- Error code: `RATE_LIMITED`

---

## 9. Integration Patterns

### 9.1 Internal Integration

Internal services consume APIs with the same contract as external consumers. Internal does not mean trusted.

Internal integration requirements:
- Same authentication requirements
- Same authorization checks
- Same rate limits (potentially higher thresholds)
- Same error handling

### 9.2 Agent Integration

The AI agent is a first-class API consumer with specific constraints:

Agent-specific rules:
- Read-only access (GET methods only)
- User authorization context required on every request
- Same rate limits as user (no elevated limits)
- Responses filtered by user permissions

The agent may have dedicated endpoints optimized for its query patterns, but these endpoints follow all standard API conventions.

### 9.3 External Integration

External integrations follow stricter controls:
- Dedicated API keys with explicit scope
- Audit logging of all access
- Potentially stricter rate limits
- Explicit data sharing agreements where required

External integrations are documented in an integration registry.

---

## 10. Scope Boundaries

### 10.1 In Scope

- API design principles
- Request and response standards
- Versioning policy
- Error handling standards
- Authentication and authorization requirements
- Rate limiting policy
- Integration patterns

### 10.2 Explicitly Out of Scope

- Specific endpoint definitions (domain concern)
- Authentication mechanism implementation (security concern)
- API gateway configuration (infrastructure concern)
- SDK or client library design (consumer tooling)

### 10.3 Intentionally Excluded

The following API patterns are explicitly rejected:

- GraphQL (REST meets current needs; consistency over flexibility)
- SOAP or XML-based APIs
- RPC-style endpoints (verbs in URLs)
- Unversioned APIs
- APIs that return different structures based on undocumented conditions
- APIs that require client-side state beyond authentication
- Offset-based pagination for large datasets
- Unbounded queries without pagination

---

## 11. Implications for Implementation

### 11.1 Backend

- All endpoints must validate requests before processing
- All endpoints must return consistent response structures
- All endpoints must handle errors with standard error format
- All endpoints must include appropriate status codes
- All endpoints must respect rate limits
- All mutations must be idempotent where HTTP method implies idempotency

### 11.2 Frontend

- Frontend must handle all documented error codes
- Frontend must implement pagination for all collections
- Frontend must include correlation IDs for debugging
- Frontend must respect rate limit headers
- Frontend must not depend on undocumented API behavior

### 11.3 Data

- API responses must not expose internal database structure
- API field names may differ from database column names
- API must enforce data access permissions before returning data
- Pagination cursors must be opaque and not expose internals

### 11.4 Infrastructure

- API gateway must enforce rate limits
- API gateway must route to appropriate versions
- API gateway must log all requests for audit
- TLS termination must occur at trusted boundaries

### 11.5 AI / Agent

- Agent must use standard API endpoints (or dedicated read-only variants)
- Agent requests must include user context
- Agent must handle rate limits gracefully
- Agent must not retry failed authorization (user lacks permission)

---

## 12. Explicit Anti-Patterns

The following patterns are forbidden. Implementations exhibiting these patterns are API contract violations.

| Anti-Pattern | Violation |
|--------------|-----------|
| Verbs in URLs (`/api/getUsers`) | Violates RESTful conventions |
| Unversioned endpoints | Violates versioning requirement |
| Different error formats per endpoint | Violates consistency principle |
| 200 status with error in body | Violates status code semantics |
| Breaking changes without version increment | Violates backward compatibility |
| Unbounded collection responses | Violates pagination requirement |
| Internal IDs in pagination cursors | Violates cursor opacity |
| Leaking stack traces in errors | Violates error security |
| Different auth for internal vs external | Violates uniform enforcement |
| Agent endpoints that accept mutations | Violates agent read-only constraint |
| Required fields added without version bump | Violates backward compatibility |
| Undocumented query parameters that change behavior | Violates explicit design |

---

## 13. Governance

This document defines the binding API contract. All API implementations must comply.

API changes require:
- Compliance with this contract
- Documentation updates
- Version increment if breaking
- Consumer communication for significant changes

APIs that deviate from this contract without documented exception are non-compliant.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 11:52:00 CST | Claude (acting CTO) | Initial pre-canonical draft authored under the established governance standard |
| v1.0 | 2026-01-23 11:52:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
