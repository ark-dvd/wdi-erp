const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const employeeRoleId = 'cmixhwe1n0014aveczrb7jufh';
  
  const permissions = await p.permission.findMany({ 
    where: { module: { not: 'admin' } }
  });
  
  let added = 0;
  for (const perm of permissions) {
    const existing = await p.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: employeeRoleId,
          permissionId: perm.id
        }
      }
    });
    
    if (!existing) {
      await p.rolePermission.create({
        data: {
          roleId: employeeRoleId,
          permissionId: perm.id
        }
      });
      added++;
    }
  }
  
  console.log('Added', added, 'new role-permission connections');
}

main().finally(() => p.$disconnect());
