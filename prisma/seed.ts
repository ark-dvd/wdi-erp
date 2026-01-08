import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // מחיקת נתונים קיימים (בזהירות!)
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.allowedDomain.deleteMany()

  // === דומיינים מורשים ===
  console.log('📧 Creating allowed domains...')
  await prisma.allowedDomain.createMany({
    data: [
      { domain: 'wdi.one', isActive: true },
      { domain: 'wdiglobal.com', isActive: true },
    ],
  })

  // === הרשאות ===
  console.log('🔐 Creating permissions...')
  const modules = ['hr', 'equipment', 'vehicles', 'vendors', 'projects', 'contracts', 'finance', 'admin']
  const actions = ['view', 'create', 'edit', 'delete']

  const permissions: { module: string; action: string; description: string }[] = []

  for (const module of modules) {
    for (const action of actions) {
      const descriptions: Record<string, string> = {
        hr: 'כוח אדם',
        equipment: 'ציוד',
        vehicles: 'רכבים',
        vendors: 'ספקים',
        projects: 'פרויקטים',
        contracts: 'חוזים',
        finance: 'פיננסי',
        admin: 'ניהול מערכת',
      }
      permissions.push({
        module,
        action,
        description: `${action} ${descriptions[module]}`,
      })
    }
  }

  for (const perm of permissions) {
    await prisma.permission.create({ data: perm })
  }

  // === תפקידים ===
  console.log('👥 Creating roles...')
  const roles = [
    { name: 'founder', displayName: 'מייסד שותף', description: 'גישה מלאה לכל המערכת' },
    { name: 'ceo', displayName: 'מנכ"ל', description: 'גישה מלאה לכל המערכת' },
    { name: 'office_manager', displayName: 'מנהל/ת משרד', description: 'גישה מלאה להזנה וצפייה' },
    { name: 'department_manager', displayName: 'מנהל/ת תחום', description: 'גישה לפרויקטים בתחום' },
    { name: 'project_manager', displayName: 'מנהל/ת פרויקט', description: 'גישה לפרויקטים משויכים' },
    { name: 'secretary', displayName: 'מזכיר/ה', description: 'צפייה והזנה בנתונים בסיסיים' },
    { name: 'employee', displayName: 'עובד/ת', description: 'גישה לנתונים אישיים בלבד' },
  ]

  for (const role of roles) {
    await prisma.role.create({ data: role })
  }

  // === הקצאת הרשאות לתפקידים ===
  console.log('🔗 Assigning permissions to roles...')
  const allPermissions = await prisma.permission.findMany()
  const allRoles = await prisma.role.findMany()

  const getRoleId = (name: string) => allRoles.find((r) => r.name === name)?.id!
  const getPermId = (module: string, action: string) =>
    allPermissions.find((p) => p.module === module && p.action === action)?.id!

  // מייסד ומנכ"ל - הכל
  for (const roleName of ['founder', 'ceo']) {
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: getRoleId(roleName), permissionId: perm.id },
      })
    }
  }

  // מנהל משרד - הכל חוץ מפיננסי (רק צפייה בפיננסי)
  const officeManagerModules = ['hr', 'equipment', 'vehicles', 'vendors', 'projects', 'contracts', 'admin']
  for (const module of officeManagerModules) {
    for (const action of actions) {
      await prisma.rolePermission.create({
        data: { roleId: getRoleId('office_manager'), permissionId: getPermId(module, action) },
      })
    }
  }
  await prisma.rolePermission.create({
    data: { roleId: getRoleId('office_manager'), permissionId: getPermId('finance', 'view') },
  })

  // מנהל תחום - פרויקטים, ספקים, חוזים (צפייה ועריכה)
  const deptManagerModules = ['projects', 'vendors', 'contracts']
  for (const module of deptManagerModules) {
    for (const action of ['view', 'create', 'edit']) {
      await prisma.rolePermission.create({
        data: { roleId: getRoleId('department_manager'), permissionId: getPermId(module, action) },
      })
    }
  }
  // צפייה בכוח אדם, ציוד, רכבים
  for (const module of ['hr', 'equipment', 'vehicles']) {
    await prisma.rolePermission.create({
      data: { roleId: getRoleId('department_manager'), permissionId: getPermId(module, 'view') },
    })
  }

  // מנהל פרויקט - פרויקטים משלו, ספקים
  for (const module of ['projects', 'vendors']) {
    for (const action of ['view', 'create', 'edit']) {
      await prisma.rolePermission.create({
        data: { roleId: getRoleId('project_manager'), permissionId: getPermId(module, action) },
      })
    }
  }
  await prisma.rolePermission.create({
    data: { roleId: getRoleId('project_manager'), permissionId: getPermId('contracts', 'view') },
  })

  // מזכירה - צפייה והזנה בנתונים בסיסיים
  const secretaryModules = ['hr', 'equipment', 'vehicles', 'vendors']
  for (const module of secretaryModules) {
    for (const action of ['view', 'create', 'edit']) {
      await prisma.rolePermission.create({
        data: { roleId: getRoleId('secretary'), permissionId: getPermId(module, action) },
      })
    }
  }
  await prisma.rolePermission.create({
    data: { roleId: getRoleId('secretary'), permissionId: getPermId('projects', 'view') },
  })

  // עובד - רק צפייה ועריכה בנתונים אישיים (HR)
  await prisma.rolePermission.create({
    data: { roleId: getRoleId('employee'), permissionId: getPermId('hr', 'view') },
  })
  await prisma.rolePermission.create({
    data: { roleId: getRoleId('employee'), permissionId: getPermId('hr', 'edit') },
  })

  // === משתמש ראשוני - אריק ===
  console.log('👤 Creating initial user (Arik)...')
  const founderRole = await prisma.role.findFirst({ where: { name: 'founder' } })
  
  if (founderRole) {
    await prisma.user.create({
      data: {
        email: 'arik@wdi.one',
        name: 'אריק דוידי',
        roleId: founderRole.id,
        isActive: true,
      },
    })
  }

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
