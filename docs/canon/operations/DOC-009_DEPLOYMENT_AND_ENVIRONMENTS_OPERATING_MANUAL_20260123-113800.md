---
Canonical Document ID: DOC-009
Document Title: Deployment & Environments Operating Manual
Document Type: Canonical
Status: Canonical
Baseline Reference: Canonical Baseline v1.0
Baseline Locked At: 2026-01-23 11:38:00 CST
Author: Claude (acting CTO)
Owner: Product / Engineering Leadership
Timezone: America/Chicago (CST)
Created At: 2026-01-23 11:38:00 CST
Last Updated: 2026-01-23 11:38:00 CST
Current Version: v1.0
---

# DOC-009 — Deployment & Environments Operating Manual

---

## 1. Purpose

This document defines how the WDI ERP system is built, deployed, and operated across environments.

Deployment is not a technical afterthought. Deployment is the mechanism by which code becomes value. A system that cannot be reliably deployed cannot be reliably operated.

Environments exist to provide isolation between different stages of the software lifecycle. Mixing concerns across environments creates risk.

---

## 2. Deployment Principles

### 2.1 Reproducible Builds Only

Every build must be reproducible from source. Given the same source code and build configuration, the output must be identical.

Reproducibility requirements:
- All dependencies are pinned to specific versions
- Build environment is containerized and versioned
- No manual steps in the build process
- Build artifacts are immutable once created

If a build cannot be reproduced, it cannot be trusted.

### 2.2 No Manual Production Changes

All changes to production flow through the deployment pipeline. Manual modifications to production systems are forbidden.

This includes:
- Code changes
- Configuration changes
- Database schema changes
- Infrastructure changes

Emergency hotfixes follow the same pipeline with expedited review, not a bypass of the pipeline.

### 2.3 Rollback Must Always Be Possible

Every deployment must be reversible. The ability to roll back to the previous known-good state is mandatory.

Rollback requirements:
- Previous deployment artifacts are retained
- Database migrations are backward-compatible or have explicit rollback scripts
- Rollback procedure is documented and tested
- Rollback can be executed within minutes, not hours

Deployments that cannot be rolled back require explicit risk acceptance.

### 2.4 Deploy What You Test

The artifact deployed to production must be identical to what was tested in staging. Building separately for each environment is forbidden.

Build once, deploy many times. Environment differences are configuration, not code.

---

## 3. Environment Definitions

### 3.1 Local Environment

**Purpose:** Individual developer workspace for coding, debugging, and unit testing.

**Characteristics:**
- Runs on developer machines
- Uses local or containerized dependencies
- Data is synthetic or minimal seed data
- Configuration optimized for development speed
- No access to production data under any circumstance

**Constraints:**
- May diverge from production architecture for convenience
- Not suitable for integration testing
- Not connected to shared services

### 3.2 Staging Environment

**Purpose:** Pre-production validation, integration testing, and final verification before production release.

**Characteristics:**
- Mirrors production architecture exactly
- Uses the same deployment artifacts as production
- Data is synthetic or sanitized copies of production patterns
- Configuration matches production with environment-specific values
- Accessible to development and QA team

**Constraints:**
- Must mirror production infrastructure configuration
- Must not contain production data without explicit sanitization
- Must be stable enough for meaningful testing
- Changes require the same pipeline as production

**Critical Requirement:** Staging must be architecturally identical to production. If staging passes but production fails, staging has failed its purpose.

### 3.3 Production Environment

**Purpose:** Live operational system serving real users with real data.

**Characteristics:**
- Runs the released, tested deployment artifacts
- Contains real operational data
- Configuration optimized for performance, reliability, and security
- Accessible only to authorized operators
- Fully monitored and alerted

**Constraints:**
- No direct code execution or debugging
- No manual data modifications except through application interfaces
- No experimental features without explicit feature flags
- All access is logged and auditable

---

## 4. Environment Isolation

### 4.1 Data Isolation

Data must not flow between environments without explicit, controlled processes.

| Flow | Permitted | Requirements |
|------|-----------|--------------|
| Production → Staging | Restricted | Sanitization, approval, audit |
| Production → Local | Forbidden | Never |
| Staging → Local | Permitted | Synthetic data only |
| Local → Staging | Via pipeline | Code only, through version control |
| Staging → Production | Via pipeline | Tested artifacts only |

Production data in non-production environments is a security incident.

### 4.2 Network Isolation

Environments must be network-isolated. Cross-environment network access is forbidden except for:
- Deployment pipeline pushing artifacts
- Monitoring systems collecting metrics
- Explicit, documented integration points

A developer machine must not be able to reach production databases directly.

### 4.3 Credential Isolation

Each environment has its own credentials. Credential sharing across environments is forbidden.

- Production credentials are accessible only to production systems and authorized operators
- Staging credentials are accessible to staging systems and authorized testers
- Local credentials are developer-specific and have no access to shared environments

Hardcoding any credential in code is forbidden, regardless of environment.

---

## 5. Deployment Pipeline

### 5.1 Pipeline Stages

The deployment pipeline follows these stages:

1. **Source**: Code committed to version control
2. **Build**: Artifact created from source
3. **Test**: Automated tests executed against artifact
4. **Stage**: Artifact deployed to staging environment
5. **Validate**: Manual or automated validation in staging
6. **Release**: Artifact promoted to production
7. **Verify**: Post-deployment verification in production

Each stage has explicit entry and exit criteria. Failure at any stage blocks progression.

### 5.2 Pipeline Requirements

**Source stage:**
- All changes go through version control
- All changes require code review approval
- Main branch is always deployable

**Build stage:**
- Build is automated and reproducible
- Build artifacts are versioned and stored
- Build metadata includes source commit, timestamp, and builder identity

**Test stage:**
- Unit tests pass
- Integration tests pass
- Security scans pass
- No critical or high vulnerabilities

**Stage deployment:**
- Artifact deployed to staging
- Smoke tests verify basic functionality
- No production traffic or data

**Validation:**
- Functional testing against acceptance criteria
- Performance validation against baseline
- Security validation if applicable

**Release:**
- Explicit approval required
- Deployment window confirmed
- Rollback plan confirmed
- Stakeholders notified

**Verification:**
- Health checks pass
- Key functionality verified
- Monitoring confirms normal behavior
- Rollback criteria defined and monitored

### 5.3 Pipeline Failure Handling

When the pipeline fails:
- Deployment stops at the failed stage
- Failure is logged and notified
- No manual override to skip failed stages
- Fix forward or roll back; no manual patches

---

## 6. Secrets Management

### 6.1 Secrets Principles

Secrets are sensitive configuration values that provide access to protected resources. Secrets require special handling throughout their lifecycle.

Secrets include:
- Database credentials
- API keys
- Encryption keys
- Service account credentials
- OAuth client secrets

### 6.2 Secrets Storage

Secrets must be stored in dedicated secrets management systems. Secrets must never be stored in:
- Source code
- Version control (even in "private" repositories)
- Configuration files committed to version control
- Container images
- Log files
- Error messages

### 6.3 Secrets Access

Secrets are accessible only to:
- The services that require them (runtime injection)
- Authorized operators for management purposes
- Deployment systems for provisioning

Access to secrets is logged. Secrets are never displayed in plain text in UIs or logs.

### 6.4 Secrets Rotation

Secrets must be rotatable without service disruption. Rotation requirements:
- Applications must support credential refresh without restart
- Old credentials remain valid during rotation window
- Rotation is logged and auditable
- Compromised secrets are rotated immediately

---

## 7. Release Management

### 7.1 Version Numbering

All releases are versioned. Version numbers follow the format: `VV.DDMMYYYY.HHMM` where:
- VV: Major version
- DDMMYYYY: Release date
- HHMM: Release time (CST)

Example: `01.23012026.1430` represents major version 1, released January 23, 2026 at 14:30 CST.

### 7.2 Release Notes

Every release includes release notes documenting:
- Version number
- Release date and time
- Summary of changes
- Known issues
- Rollback instructions if special handling required

Release notes are created before deployment, not after.

### 7.3 Release Windows

Production releases occur during defined release windows:
- Standard: Business hours with team availability
- Maintenance: Scheduled off-hours for higher-risk changes
- Emergency: Any time with explicit approval and heightened monitoring

Release window selection is based on change risk assessment.

---

## 8. Scope Boundaries

### 8.1 In Scope

- Environment definitions and purposes
- Environment isolation requirements
- Deployment pipeline stages and requirements
- Secrets management principles
- Release management practices

### 8.2 Explicitly Out of Scope

- Specific CI/CD tool configuration (implementation concern)
- Infrastructure provisioning details (infrastructure concern)
- Monitoring configuration (observability concern)
- Incident response procedures (operations concern)

### 8.3 Intentionally Excluded

The following practices are explicitly rejected:

- Manual deployments to production ("just this once")
- Shared credentials across environments
- Production data in development environments
- Skipping staging for "urgent" releases
- Secrets in source code ("it's a private repo")
- Deployments without rollback capability
- Building different artifacts for different environments

---

## 9. Implications for Implementation

### 9.1 Backend

- Applications must externalize all configuration
- Applications must support graceful shutdown for zero-downtime deployment
- Applications must expose health check endpoints
- Applications must handle credential rotation without restart
- Database migrations must be backward-compatible or have rollback scripts

### 9.2 Frontend

- Frontend builds must be reproducible
- Static assets must be versioned for cache invalidation
- Environment-specific configuration must be injected at runtime
- Build artifacts must not contain environment-specific values

### 9.3 Data

- Schema migrations are part of the deployment pipeline
- Migrations must be tested in staging before production
- Data backups occur before schema migrations
- Rollback scripts exist for all migrations

### 9.4 Infrastructure

- Infrastructure configuration is version-controlled
- Infrastructure changes follow the same review process as code
- Environment parity is verified automatically
- Secrets management systems are configured for each environment

### 9.5 AI / Agent

- Agent deployments follow the same pipeline as main application
- Agent configuration is externalized like all other configuration
- Agent versions are tracked and correlate with main application versions

---

## 10. Explicit Anti-Patterns

The following patterns are forbidden. Implementations exhibiting these patterns are defective.

| Anti-Pattern | Violation |
|--------------|-----------|
| SSH into production to fix a bug | Violates no manual production changes |
| Different build for staging vs production | Violates deploy what you test |
| Hardcoded database password in code | Violates secrets management |
| Copying production database to laptop | Violates data isolation |
| Skipping staging because "it's a small change" | Violates pipeline requirements |
| Storing secrets in environment files in git | Violates secrets storage |
| Deploying on Friday afternoon | Violates release window prudence |
| "We'll add rollback capability later" | Violates rollback requirement |
| Shared service account across all environments | Violates credential isolation |
| Manual database migration in production | Violates deployment pipeline |
| Building from local machine to production | Violates reproducible builds |
| Disabling tests to make pipeline pass | Violates test stage requirements |

---

## 11. Governance

This document defines binding deployment and environment requirements. All releases must comply with this operational manual.

Exceptions require:
- Documented justification
- Risk assessment
- Compensating controls
- Time-limited approval
- Post-incident review if exception leads to issues

Chronic exceptions indicate process failures requiring systemic correction.

---

## Version History

| Version | Date & Time (CST) | Author | Description |
|---------|-------------------|--------|-------------|
| v0.1 | 2026-01-23 11:38:00 CST | Claude (acting CTO) | Initial pre-canonical draft authored under the established governance standard |
| v1.0 | 2026-01-23 11:38:00 CST | Claude (acting CTO) | Promotion to Canonical per approved Document Registry & Baseline v1.0 |

---

End of Document
