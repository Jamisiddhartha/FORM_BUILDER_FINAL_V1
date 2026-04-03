import { PrismaClient } from '@prisma/client';

export async function seedTenants(prisma: PrismaClient) {
  console.log('  Seeding tenants and tenant projects...');

  const temporaryProjects = [
    {
      id: 101,
      name: 'Industrial Approval',
      code: 'INDUSTRIAL_APPROVAL',
      description: 'Temporary project used by the master-data UI for industrial approval flows.',
    },
    {
      id: 102,
      name: 'Forest Clearance',
      code: 'FOREST_CLEARANCE',
      description: 'Temporary project used by the master-data UI for forest clearance flows.',
    },
    {
      id: 103,
      name: 'Environmental Certificate',
      code: 'ENVIRONMENTAL_CERTIFICATE',
      description: 'Temporary project used by the master-data UI for environmental certificate flows.',
    },
  ] as const;

  const settings = JSON.stringify({
    max_users: 100,
    allow_custom_modules: true,
  });

  const tenantRows = await prisma.$queryRawUnsafe<Array<{ id: number; name: string; slug: string }>>(
    `
      INSERT INTO public."tenants" (
        name,
        slug,
        domain,
        primary_color,
        plan,
        settings,
        is_active
      )
      VALUES (
        'Single Window Clearance System',
        'swcs',
        'swcs.platform.gov.in',
        '#1A5276',
        'STANDARD',
        $1::jsonb,
        TRUE
      )
      ON CONFLICT (slug) DO UPDATE
      SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        primary_color = EXCLUDED.primary_color,
        plan = EXCLUDED.plan,
        settings = EXCLUDED.settings,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id, name, slug
    `,
    settings,
  );

  const tenant = tenantRows[0];

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO public."tenant_projects" (
        tenant_id,
        name,
        code,
        description,
        start_date,
        is_active
      )
      VALUES (
        $1,
        'Master Data Management',
        'MASTER_DATA',
        'Default project used for tenant-scoped dynamic master data.',
        NOW(),
        TRUE
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = TRUE,
        updated_at = NOW()
    `,
    tenant.id,
  );

  for (const project of temporaryProjects) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO public."tenant_projects" (
          id,
          tenant_id,
          name,
          code,
          description,
          start_date,
          is_active
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW(),
          TRUE
        )
        ON CONFLICT (id) DO UPDATE
        SET
          tenant_id = EXCLUDED.tenant_id,
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          description = EXCLUDED.description,
          is_active = TRUE,
          updated_at = NOW()
      `,
      project.id,
      tenant.id,
      project.name,
      project.code,
      project.description,
    );
  }

  console.log(`  Tenant ready: ${tenant.name} (${tenant.slug})`);
}

async function main() {
  const prisma = new PrismaClient();

  try {
    await seedTenants(prisma);
    console.log('  Tenants seed complete.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('  Tenant seeding failed:', error);
    process.exit(1);
  });
}
