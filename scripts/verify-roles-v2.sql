-- ================================================
-- WDI ERP - RBAC v2 Role Verification Query
-- Version: 20260126-RBAC-V2
-- Implements: DOC-013 §4.1 Role Verification
-- ================================================
--
-- Run this query against the database to verify roles
-- match the DOC-013 v2 specification.
--
-- Expected: 10 canonical roles with correct names
-- ================================================

-- List all roles ordered by level
SELECT
  name AS "Role ID",
  "displayName" AS "Display Name (Hebrew)",
  level AS "Level",
  CASE
    WHEN name IN ('owner', 'executive', 'trust_officer', 'pmo',
                  'finance_officer', 'domain_head', 'project_manager',
                  'project_coordinator', 'administration', 'all_employees')
    THEN '✓ Canonical'
    ELSE '✗ Non-canonical'
  END AS "Status"
FROM "Role"
ORDER BY level ASC, name ASC;

-- Verify all 10 canonical roles exist
SELECT
  CASE
    WHEN COUNT(*) = 10 THEN '✓ PASS: All 10 canonical roles exist'
    ELSE '✗ FAIL: Expected 10 roles, found ' || COUNT(*) || ' canonical roles'
  END AS "Canonical Role Count Check"
FROM "Role"
WHERE name IN ('owner', 'executive', 'trust_officer', 'pmo',
               'finance_officer', 'domain_head', 'project_manager',
               'project_coordinator', 'administration', 'all_employees');

-- Check for deprecated v1 role names (should return 0 rows)
SELECT
  name AS "Deprecated Role (should not exist)",
  CASE
    WHEN name = 'senior_pm' THEN 'Should be: project_manager'
    WHEN name = 'operations_staff' THEN 'Should be: administration'
    WHEN name = 'founder' THEN 'Should be: owner'
    WHEN name = 'employee' THEN 'Should be: all_employees'
    ELSE 'Unknown legacy role'
  END AS "Migration Needed"
FROM "Role"
WHERE name IN ('senior_pm', 'operations_staff', 'founder', 'employee');

-- Summary: user assignments per role
SELECT
  r.name AS "Role",
  r."displayName" AS "Display Name",
  COUNT(ur."userId") AS "User Count"
FROM "Role" r
LEFT JOIN "UserRole" ur ON r.id = ur."roleId"
GROUP BY r.id, r.name, r."displayName"
ORDER BY r.level ASC;
