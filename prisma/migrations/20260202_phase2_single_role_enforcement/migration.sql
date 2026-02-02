-- Phase 2 / INV-007: Single Role Enforcement
-- Per DOC-016 v2.0: Users must hold exactly one role at any time.
-- No permission unions across roles.

-- ============================================================
-- STEP 1: Consolidate existing multi-role users
-- Selection rule (deterministic):
--   1. Keep the role with the highest RolePermission count (most permissions)
--   2. Tie-breaker: smallest roleId lexicographically
-- ============================================================

-- Create a temp table to identify which UserRole rows to keep
CREATE TEMP TABLE _phase2_keep_roles AS
WITH role_permission_counts AS (
  -- Count permissions per role
  SELECT "roleId", COUNT(*) as perm_count
  FROM "RolePermission"
  GROUP BY "roleId"
),
user_role_ranked AS (
  -- Rank each user's roles: most permissions first, then smallest roleId
  SELECT
    ur.id,
    ur."userId",
    ur."roleId",
    COALESCE(rpc.perm_count, 0) as perm_count,
    ROW_NUMBER() OVER (
      PARTITION BY ur."userId"
      ORDER BY COALESCE(rpc.perm_count, 0) DESC, ur."roleId" ASC
    ) as rank
  FROM "UserRole" ur
  LEFT JOIN role_permission_counts rpc ON ur."roleId" = rpc."roleId"
)
SELECT id, "userId", "roleId"
FROM user_role_ranked
WHERE rank = 1;

-- Delete all UserRole rows EXCEPT the ones we want to keep
DELETE FROM "UserRole"
WHERE id NOT IN (SELECT id FROM _phase2_keep_roles);

-- Clean up temp table
DROP TABLE _phase2_keep_roles;

-- ============================================================
-- STEP 2: Add unique constraint to enforce single role per user
-- This prevents any future multi-role assignments at DB level
-- ============================================================

-- Drop the old composite unique constraint (userId, roleId)
ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_roleId_key";

-- Add the new single-column unique constraint on userId
-- This enforces: exactly ONE role per user
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_key" UNIQUE ("userId");

-- ============================================================
-- VERIFICATION: This query MUST return zero rows after migration
-- SELECT "userId" FROM "UserRole" GROUP BY "userId" HAVING COUNT(*) > 1;
-- ============================================================
