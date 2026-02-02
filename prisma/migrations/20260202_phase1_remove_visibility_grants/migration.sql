-- Phase 1 / FP-006: Remove Visibility Grants
-- Per DOC-016: Visibility Grants are an explicitly rejected RBAC pattern in v2
-- Read scope is built into roles; this pattern MUST be removed entirely

-- Drop the VisibilityGrant table and all its constraints
DROP TABLE IF EXISTS "VisibilityGrant";
