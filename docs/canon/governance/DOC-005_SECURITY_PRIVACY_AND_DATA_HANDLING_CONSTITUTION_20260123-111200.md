---
Canonical Document ID: DOC-005
Document Title: Security, Privacy & Data Handling Constitution
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 11:12:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 11:12:00 CST
Last Updated: 2026-01-23 11:12:00 CST
Current Version: v1.0
---

# DOC-005 — Security, Privacy & Data Handling Constitution

---

## 1. Purpose

This document defines the non-negotiable security, privacy, and data handling principles that govern the WDI ERP system.

Security is not a feature. Security is a property of the system that must be preserved at every layer, in every component, and through every change. A system that is functional but insecure is a liability, not an asset.

Privacy is not a compliance checkbox. Privacy is a commitment to users that their data will be handled with respect and restraint.

---

## 2. Security Principles

### 2.1 Least Privilege by Default

Every user, service, and component operates with the minimum permissions required to perform its function. Elevated access is granted explicitly, scoped narrowly, and revoked promptly when no longer needed.

Default access is no access. Permission must be granted, never assumed.

### 2.2 Explicit Access Over Implicit Access

All access decisions are explicit and traceable. Access based on network location, service identity, or implicit trust relationships is forbidden.

If access is granted, there must be a record of who granted it, to whom, for what scope, and when.

### 2.3 Defense in Depth

Security relies on multiple independent layers. Failure of one layer must not compromise the entire system.

Layers include:
- Network boundaries and firewall rules
- Authentication at every entry point
- Authorization at every data access point
- Encryption in transit and at rest
- Audit logging of all sensitive operations
- Input validation at all boundaries

No single layer is trusted to be sufficient.

### 2.4 Zero Trust Between Components

Components within the system do not trust each other implicitly. Every inter-component communication must be authenticated and authorized.

Internal network location does not confer trust. A service calling another service must prove its identity and demonstrate authorization for the requested operation.

### 2.5 Assume Breach

The system is designed with the assumption that breaches are possible. Detection, containment, and recovery mechanisms must exist.

Security is not only about prevention. It is equally about limiting blast radius and enabling rapid response.

---

## 3. Data Classification

All data in the system is classified according to sensitivity. Classification determines storage, access, transmission, and retention requirements.

### 3.1 Classification Levels

| Level | Description | Examples |
|-------|-------------|----------|
| Public | Information that may be freely disclosed | Company name, public project names |
| Internal | Information for internal use only | Project schedules, internal communications |
| Confidential | Sensitive business information | Vendor contracts, financial projections, personnel evaluations |
| Restricted | Highest sensitivity; legal or regulatory implications | PII, government ID numbers, medical information, legal documents |

### 3.2 Classification Requirements

**Public**
- No special handling required
- May be cached, logged, and displayed freely

**Internal**
- Authentication required for access
- Must not be exposed to unauthenticated users
- May be logged with standard retention

**Confidential**
- Authentication and authorization required
- Access must be logged with actor identity
- Transmission must be encrypted
- Storage must be encrypted
- Retention limits apply

**Restricted**
- All Confidential requirements apply
- Access requires explicit business justification
- Access logs are reviewed periodically
- Data minimization principles apply
- May have additional legal retention or deletion requirements

### 3.3 Default Classification

Data without explicit classification is treated as Confidential until classified. This is a conservative default that protects against accidental exposure.

---

## 4. Data Access Rules

### 4.1 Authentication

All access to the system is authenticated. Anonymous access is forbidden for any operational data.

Authentication requirements:
- Users authenticate via the designated identity provider
- Service accounts authenticate via secure credential exchange
- API consumers authenticate via tokens or keys
- The AI agent inherits the authentication context of the requesting user

Authentication is verified on every request. Cached authentication state is convenience only; the authorization service is the source of truth.

### 4.2 Authorization

All access to sensitive data is authorized. Authentication alone is not sufficient.

Authorization requirements:
- Users are authorized through role-based permissions
- Permissions are checked at data access boundaries, not only at UI layer
- Authorization decisions are logged for Confidential and Restricted data
- The AI agent is authorized only for read operations within user scope

Authorization failures are logged with full context for security review.

### 4.3 Audit Logging

All access to critical data is logged. Logs capture:
- Actor identity (who)
- Operation performed (what)
- Target data (which records)
- Timestamp (when)
- Outcome (success or failure)
- Request context (where applicable)

Audit logs are:
- Immutable after creation
- Retained according to classification-based retention policy
- Accessible only to authorized security and compliance personnel
- Never truncated or deleted outside of retention policy

---

## 5. Privacy Doctrine

### 5.1 Purpose Limitation

User data exists solely to serve operational needs. Data collected for one purpose must not be used for unrelated purposes without explicit authorization.

The question "why do we need this data?" must have a clear, operational answer. Data collection without purpose is forbidden.

### 5.2 Data Minimization

The system collects only the data necessary for its operational function. Collecting data "because we might need it someday" is forbidden.

Every data field must justify its existence with a concrete operational use case.

### 5.3 Retention Limits

Data is retained only as long as necessary for its operational purpose or legal requirement. Indefinite retention without justification is forbidden.

Retention policies must be:
- Documented for each data category
- Enforced through automated processes where possible
- Auditable for compliance

### 5.4 User Rights

Users have the right to:
- Know what data is stored about them
- Request correction of inaccurate data
- Request deletion of data no longer operationally necessary (subject to legal retention requirements)

These rights are operational requirements, not optional courtesies.

### 5.5 Secondary Use Prohibition

Using operational data for purposes beyond its collection intent—analytics, profiling, marketing, third-party sharing—is forbidden unless explicitly authorized by appropriate authority and documented.

---

## 6. Encryption Standards

### 6.1 Encryption in Transit

All data in transit must be encrypted using current industry-standard protocols.

Requirements:
- TLS 1.2 or higher for all HTTP communications
- Certificate validation is mandatory; self-signed certificates are forbidden in production
- Internal service-to-service communication must also be encrypted

### 6.2 Encryption at Rest

Confidential and Restricted data must be encrypted at rest.

Requirements:
- Database encryption at the storage layer
- File storage encryption for uploaded documents
- Encryption keys managed through secure key management practices
- Keys rotated according to documented schedule

### 6.3 Key Management

Encryption keys must be:
- Stored separately from encrypted data
- Accessible only to authorized services and personnel
- Rotated periodically and after any suspected compromise
- Backed up securely for disaster recovery

Hardcoded keys are forbidden. Keys in source code are forbidden. Keys in configuration files committed to version control are forbidden.

---

## 7. Incident Handling

### 7.1 Incident Assumption

Security incidents are assumed possible. The question is not "if" but "when."

### 7.2 Incident Preparedness

The system must support:
- Detection of anomalous access patterns
- Rapid identification of affected data and users
- Containment through access revocation and system isolation
- Forensic investigation through comprehensive audit logs
- Recovery through documented procedures and backups

### 7.3 Incident Response

When an incident is suspected:
1. Contain: Limit ongoing damage through immediate access restrictions
2. Assess: Determine scope, affected data, and affected users
3. Notify: Inform appropriate stakeholders and authorities as required
4. Remediate: Address the vulnerability that enabled the incident
5. Review: Document lessons learned and update defenses

Incident response procedures must be documented and tested periodically.

---

## 8. Scope Boundaries

### 8.1 In Scope

- Security principles governing system design and operation
- Data classification framework
- Access control requirements
- Privacy principles and user rights
- Encryption standards
- Incident handling requirements

### 8.2 Explicitly Out of Scope

- Specific authentication implementation (technology choice)
- Specific authorization implementation (see Authorization Model document)
- Network architecture details (infrastructure concern)
- Physical security (facility concern)

### 8.3 Intentionally Excluded

The following security approaches are explicitly rejected:

- Security through obscurity as a primary defense
- Implicit trust based on network location
- Single-factor authentication for sensitive operations
- Permanent elevated access grants
- Audit log deletion for storage optimization
- Privacy policies that permit unlimited secondary use

---

## 9. Implications for Implementation

### 9.1 Backend

- All endpoints must verify authentication before any processing
- All data access must check authorization after authentication
- All mutations must generate audit log entries
- Input validation must occur at all external boundaries
- Error messages must not leak sensitive system information
- Secrets must be loaded from secure configuration, never hardcoded

### 9.2 Frontend

- Authentication tokens must be stored securely (HTTP-only cookies preferred)
- Sensitive data must not be logged to browser console
- Authorization failures must be handled gracefully without exposing details
- User input must be sanitized before display to prevent injection attacks
- Session timeout must be enforced for inactive users

### 9.3 Data

- All Confidential and Restricted columns must be identified in schema documentation
- Database connections must use encrypted channels
- Database credentials must have minimum necessary privileges
- Query logging must not capture sensitive parameter values
- Backup encryption must match or exceed production encryption

### 9.4 Infrastructure

- Network segmentation must isolate sensitive components
- Firewall rules must default to deny
- Security patches must be applied within documented timeframes
- Access to production infrastructure must require multi-factor authentication
- Infrastructure changes must be logged and auditable

### 9.5 AI / Agent

- Agent must inherit user authorization context for all queries
- Agent must not cache sensitive data beyond request scope
- Agent must not expose data classification in responses
- Agent error messages must not reveal security implementation details
- Agent queries must be logged with same rigor as direct user access

---

## 10. Explicit Anti-Patterns

The following patterns are forbidden. Any implementation exhibiting these patterns is a security defect.

| Anti-Pattern | Violation |
|--------------|-----------|
| Storing passwords in plain text | Violates encryption standards |
| Hardcoding credentials in source code | Violates key management |
| Logging sensitive data (passwords, tokens, PII) | Violates data handling |
| Trusting input without validation | Violates defense in depth |
| Granting permanent admin access | Violates least privilege |
| Disabling TLS for "internal" services | Violates encryption in transit |
| Catching and ignoring authentication errors | Violates security principles |
| Exposing stack traces to end users | Violates information disclosure |
| Using deprecated cryptographic algorithms | Violates encryption standards |
| Deleting audit logs to save storage | Violates audit requirements |
| Collecting data without operational justification | Violates data minimization |
| Sharing data with third parties without authorization | Violates secondary use prohibition |
| Implicit trust based on service name or network location | Violates zero trust |
| Single point of security failure | Violates defense in depth |

---

## 11. Governance

This document defines binding security requirements. All system participants—developers, operators, and automated agents—must comply.

Security exceptions require:
- Documented business justification
- Risk assessment
- Compensating controls
- Time-limited approval with review date
- Security authority sign-off

Undocumented exceptions are violations.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 11:12:00 CST | Claude (acting CTO) | Initial pre-canonical draft authored under the established governance standard |
| v1.0 | 2026-01-23 11:12:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
