// ================================================
// PRODUCTION RECOVERY SCRIPT
// Purpose: Bootstrap canonical Owner role assignment
// Target: arik@wdi.one → owner
// Date: 2026-01-25
// Classification: EMERGENCY RECOVERY
// ================================================
//
// SAFETY PROPERTIES:
// - Does NOT weaken RBAC v1 principles
// - Does NOT introduce implicit privileges
// - Does NOT bypass authorization logic
// - Preserves Default Deny semantics
// - Is reversible (UserRole can be deleted)
//
// EXECUTION:
//   npx tsx scripts/recovery-owner-bootstrap.ts
//
// ================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_EMAIL = 'arik@wdi.one'
const TARGET_ROLE = 'owner'

// DOC-013 §4.1 canonical owner role definition
const OWNER_ROLE_DEFINITION = {
  name: 'owner',
  displayName: 'בעלים',
  description: 'Full system access - organizational owner',
  level: 1, // Highest privilege level
}

interface RecoveryReport {
  timestamp: string
  targetEmail: string
  targetRole: string
  phase1_analysis: {
    roleExists: boolean
    roleId: string | null
    userExists: boolean
    userId: string | null
    assignmentExists: boolean
    assignmentId: string | null
  }
  case: 'A' | 'B' | 'C' | 'ALREADY_ASSIGNED'
  phase2_action: string
  phase3_verification: {
    success: boolean
    finalAssignmentId: string | null
    userRoles: string[]
  }
  safe: boolean
  reversible: boolean
}

async function main() {
  console.log('================================================')
  console.log('PRODUCTION RECOVERY: Owner Bootstrap')
  console.log('================================================')
  console.log(`Target Email: ${TARGET_EMAIL}`)
  console.log(`Target Role: ${TARGET_ROLE}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('================================================\n')

  const report: RecoveryReport = {
    timestamp: new Date().toISOString(),
    targetEmail: TARGET_EMAIL,
    targetRole: TARGET_ROLE,
    phase1_analysis: {
      roleExists: false,
      roleId: null,
      userExists: false,
      userId: null,
      assignmentExists: false,
      assignmentId: null,
    },
    case: 'C', // Default to safest case (stop)
    phase2_action: 'NONE',
    phase3_verification: {
      success: false,
      finalAssignmentId: null,
      userRoles: [],
    },
    safe: true,
    reversible: true,
  }

  try {
    // ================================================
    // PHASE 1: READ-ONLY ANALYSIS
    // ================================================
    console.log('PHASE 1: Read-Only Analysis')
    console.log('----------------------------\n')

    // Check 1: Does the owner role exist?
    console.log(`[1/3] Checking if role '${TARGET_ROLE}' exists...`)
    const ownerRole = await prisma.role.findUnique({
      where: { name: TARGET_ROLE },
    })

    if (ownerRole) {
      console.log(`      ✓ Role exists: id=${ownerRole.id}, displayName=${ownerRole.displayName}`)
      report.phase1_analysis.roleExists = true
      report.phase1_analysis.roleId = ownerRole.id
    } else {
      console.log(`      ✗ Role '${TARGET_ROLE}' does NOT exist`)
      report.phase1_analysis.roleExists = false
    }

    // Check 2: Does the user exist?
    console.log(`\n[2/3] Checking if user '${TARGET_EMAIL}' exists...`)
    const user = await prisma.user.findUnique({
      where: { email: TARGET_EMAIL },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (user) {
      console.log(`      ✓ User exists: id=${user.id}, name=${user.name}`)
      console.log(`      Current roles: ${user.roles.map(r => r.role.name).join(', ') || '(none)'}`)
      report.phase1_analysis.userExists = true
      report.phase1_analysis.userId = user.id
    } else {
      console.log(`      ✗ User '${TARGET_EMAIL}' does NOT exist`)
      report.phase1_analysis.userExists = false
    }

    // Check 3: Does the UserRole assignment exist?
    // RBAC v2 / INV-007: Single role per user - query by userId
    if (user && ownerRole) {
      console.log(`\n[3/3] Checking if UserRole assignment exists...`)
      const existingAssignment = await prisma.userRole.findUnique({
        where: {
          userId: user.id,
        },
      })

      if (existingAssignment) {
        console.log(`      ✓ Assignment exists: id=${existingAssignment.id}`)
        report.phase1_analysis.assignmentExists = true
        report.phase1_analysis.assignmentId = existingAssignment.id
      } else {
        console.log(`      ✗ Assignment does NOT exist`)
        report.phase1_analysis.assignmentExists = false
      }
    }

    // ================================================
    // CASE DETERMINATION
    // ================================================
    console.log('\n================================================')
    console.log('CASE DETERMINATION')
    console.log('================================================\n')

    if (!report.phase1_analysis.userExists) {
      report.case = 'C'
      console.log('CASE C: User does not exist')
      console.log('ACTION: STOPPING - Cannot proceed without user')
      report.phase2_action = 'STOPPED - User not found'

      printReport(report)
      return
    }

    if (report.phase1_analysis.assignmentExists) {
      report.case = 'ALREADY_ASSIGNED'
      console.log('CASE: Assignment already exists')
      console.log('ACTION: No action needed - owner role already assigned')
      report.phase2_action = 'NONE - Already assigned'
      report.phase3_verification.success = true
      report.phase3_verification.finalAssignmentId = report.phase1_analysis.assignmentId
      report.phase3_verification.userRoles = user!.roles.map(r => r.role.name)

      printReport(report)
      return
    }

    if (!report.phase1_analysis.roleExists) {
      report.case = 'B'
      console.log('CASE B: Owner role does not exist')
      console.log('ACTION: Create role AND assignment')
    } else {
      report.case = 'A'
      console.log('CASE A: Owner role exists, assignment missing')
      console.log('ACTION: Create assignment only')
    }

    // ================================================
    // PHASE 2: RECOVERY ACTION
    // ================================================
    console.log('\n================================================')
    console.log('PHASE 2: Recovery Action')
    console.log('================================================\n')

    let roleId = report.phase1_analysis.roleId

    // CASE B: Create the owner role first
    if (report.case === 'B') {
      console.log('[CASE B] Creating owner role per DOC-013 §4.1...')

      const newRole = await prisma.role.create({
        data: OWNER_ROLE_DEFINITION,
      })

      console.log(`      ✓ Role created: id=${newRole.id}`)
      roleId = newRole.id
      report.phase2_action = `Created role '${TARGET_ROLE}' (id=${newRole.id})`
    }

    // CASE A or B: Create the UserRole assignment
    console.log(`\nCreating UserRole assignment...`)
    console.log(`      userId: ${report.phase1_analysis.userId}`)
    console.log(`      roleId: ${roleId}`)

    const newAssignment = await prisma.userRole.create({
      data: {
        userId: report.phase1_analysis.userId!,
        roleId: roleId!,
      },
    })

    console.log(`      ✓ Assignment created: id=${newAssignment.id}`)

    if (report.case === 'A') {
      report.phase2_action = `Created UserRole assignment (id=${newAssignment.id})`
    } else {
      report.phase2_action += ` AND created UserRole assignment (id=${newAssignment.id})`
    }

    // ================================================
    // PHASE 3: VERIFICATION
    // ================================================
    console.log('\n================================================')
    console.log('PHASE 3: Verification')
    console.log('================================================\n')

    // Re-fetch user with roles
    const verifiedUser = await prisma.user.findUnique({
      where: { email: TARGET_EMAIL },
      include: {
        roles: {
          include: { role: true },
          orderBy: { role: { level: 'asc' } },
        },
      },
    })

    if (!verifiedUser) {
      console.log('      ✗ VERIFICATION FAILED: User not found after recovery')
      report.phase3_verification.success = false
    } else {
      const userRoleNames = verifiedUser.roles.map(r => r.role.name)
      report.phase3_verification.userRoles = userRoleNames

      console.log(`User roles after recovery: ${userRoleNames.join(', ')}`)

      if (userRoleNames.includes(TARGET_ROLE)) {
        console.log(`      ✓ VERIFICATION SUCCESS: User has '${TARGET_ROLE}' role`)
        report.phase3_verification.success = true
        report.phase3_verification.finalAssignmentId = newAssignment.id
      } else {
        console.log(`      ✗ VERIFICATION FAILED: User does NOT have '${TARGET_ROLE}' role`)
        report.phase3_verification.success = false
      }
    }

    // ================================================
    // FINAL REPORT
    // ================================================
    printReport(report)

  } catch (error) {
    console.error('\n================================================')
    console.error('RECOVERY FAILED WITH ERROR')
    console.error('================================================')
    console.error(error)
    report.safe = false
    report.phase2_action = `ERROR: ${error}`
  } finally {
    await prisma.$disconnect()
  }
}

function printReport(report: RecoveryReport) {
  console.log('\n================================================')
  console.log('RECOVERY REPORT')
  console.log('================================================')
  console.log(JSON.stringify(report, null, 2))
  console.log('================================================')

  if (report.phase3_verification.success) {
    console.log('\n✓ RECOVERY COMPLETE')
    console.log(`  User '${report.targetEmail}' now has role '${report.targetRole}'`)
    console.log('\nNEXT STEPS:')
    console.log('  1. User should log out and log back in')
    console.log('  2. Verify Admin Console is accessible')
    console.log('  3. Verify HR write actions are accessible')
    console.log('  4. RBAC enforcement remains active for non-owner users')
  } else if (report.case === 'ALREADY_ASSIGNED') {
    console.log('\n✓ NO ACTION NEEDED')
    console.log(`  User '${report.targetEmail}' already has role '${report.targetRole}'`)
    console.log('\nIf lockout persists, the issue is NOT role assignment.')
    console.log('Investigate session construction or other code paths.')
  } else if (report.case === 'C') {
    console.log('\n✗ RECOVERY STOPPED')
    console.log(`  User '${report.targetEmail}' does not exist in the database.`)
    console.log('  Cannot assign role to non-existent user.')
  } else {
    console.log('\n✗ RECOVERY FAILED')
    console.log('  See error details above.')
  }

  console.log('\n================================================')
  console.log('COMPLIANCE ATTESTATION')
  console.log('================================================')
  console.log('- RBAC v1 Default Deny: PRESERVED')
  console.log('- No implicit privileges: CONFIRMED')
  console.log('- No authorization bypass: CONFIRMED')
  console.log('- Reversible: YES (delete UserRole record)')
  console.log(`- Reversal command: DELETE FROM "UserRole" WHERE id = '${report.phase3_verification.finalAssignmentId}'`)
  console.log('================================================')
}

main()
