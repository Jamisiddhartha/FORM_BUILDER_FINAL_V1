import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding master data projects...');

  // Create master data projects
  const projects = [
    {
      id: 1,
      name: 'Industrial Approval',
      code: 'INDV_APPR',
      description: 'Industrial Approval master data',
      schemaName: 'master_schema_indv_appr',
      isActive: true,
    },
    {
      id: 2,
      name: 'Forest Clearance',
      code: 'FRT_CLR',
      description: 'Forest Clearance master data',
      schemaName: 'master_schema_frt_clr',
      isActive: true,
    },
    {
      id: 3,
      name: 'Environmental Certificate',
      code: 'ENV_CERT',
      description: 'Environmental Certificate master data',
      schemaName: 'master_schema_env_cert',
      isActive: true,
    },
  ];

  for (const projectData of projects) {
    const existingProject = await prisma.masterDataProject.findUnique({
      where: { id: projectData.id },
    });

    if (!existingProject) {
      await prisma.masterDataProject.create({
        data: projectData,
      });
      console.log(`✓ Created project: ${projectData.name} (ID: ${projectData.id})`);
    } else {
      console.log(`→ Project already exists: ${projectData.name} (ID: ${projectData.id})`);
    }
  }

  console.log('Master projects seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
