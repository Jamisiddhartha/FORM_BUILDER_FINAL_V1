import { PrismaClient } from '@prisma/client';
import { seedTenants } from '../seeds/tenant.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying tenant and tenant project schema for master-data v2...');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'TenantPlan' AND n.nspname = 'public'
      ) THEN
        CREATE TYPE public."TenantPlan" AS ENUM ('STANDARD', 'PREMIUM', 'ENTERPRISE');
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."tenants" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      domain VARCHAR(255) NULL,
      logo_url VARCHAR(500) NULL,
      primary_color VARCHAR(20) NULL,
      plan public."TenantPlan" NOT NULL DEFAULT 'STANDARD',
      settings JSONB NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."tenant_projects" (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES public."tenants"(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      description TEXT NULL,
      start_date TIMESTAMPTZ(6) NULL,
      end_date TIMESTAMPTZ(6) NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      CONSTRAINT "uniq_tenant_project_tenant_code" UNIQUE ("tenant_id", "code")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_tenant_project_tenant_id"
    ON public."tenant_projects" ("tenant_id");
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO public."tenants" (
      id,
      name,
      slug,
      plan,
      settings,
      is_active
    )
    SELECT
      tenant_ids.tenant_id,
      CASE
        WHEN tenant_ids.tenant_id = 1 THEN 'Single Window Clearance System'
        ELSE 'Tenant ' || tenant_ids.tenant_id
      END,
      CASE
        WHEN tenant_ids.tenant_id = 1 THEN 'swcs'
        ELSE 'tenant-' || tenant_ids.tenant_id
      END,
      'STANDARD',
      '{}'::jsonb,
      TRUE
    FROM (
      SELECT DISTINCT tenant_id
      FROM mdm_industrial_approvals."mdm_master_definitions_v2"
      UNION
      SELECT DISTINCT tenant_id
      FROM mdm_industrial_approvals."mdm_master_data"
    ) tenant_ids
    WHERE tenant_ids.tenant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public."tenants" t
        WHERE t.id = tenant_ids.tenant_id
      );
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO public."tenant_projects" (
      id,
      tenant_id,
      name,
      code,
      description,
      is_active
    )
    SELECT
      existing_projects.project_id,
      existing_projects.tenant_id,
      'Project ' || existing_projects.project_id,
      'PROJECT_' || existing_projects.project_id,
      'Backfilled from existing master definition project_id values.',
      TRUE
    FROM (
      SELECT
        project_id,
        MIN(tenant_id) AS tenant_id
      FROM mdm_industrial_approvals."mdm_master_definitions_v2"
      WHERE project_id IS NOT NULL
      GROUP BY project_id
    ) existing_projects
    WHERE NOT EXISTS (
      SELECT 1
      FROM public."tenant_projects" tp
      WHERE tp.id = existing_projects.project_id
    );
  `);

  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('public."tenants"', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM public."tenants"), 1), 1),
      COALESCE((SELECT MAX(id) FROM public."tenants"), 0) > 0
    );
  `);

  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('public."tenant_projects"', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM public."tenant_projects"), 1), 1),
      COALESCE((SELECT MAX(id) FROM public."tenant_projects"), 0) > 0
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE mdm_industrial_approvals."mdm_master_definitions_v2"
    DROP CONSTRAINT IF EXISTS "mdm_master_definitions_v2_tenant_id_fkey";
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE mdm_industrial_approvals."mdm_master_definitions_v2"
    ADD CONSTRAINT "mdm_master_definitions_v2_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES public."tenants"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE mdm_industrial_approvals."mdm_master_definitions_v2"
    DROP CONSTRAINT IF EXISTS "mdm_master_definitions_v2_project_id_fkey";
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE mdm_industrial_approvals."mdm_master_definitions_v2"
    ADD CONSTRAINT "mdm_master_definitions_v2_project_id_fkey"
    FOREIGN KEY ("project_id")
    REFERENCES public."tenant_projects"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE mdm_industrial_approvals."mdm_master_data"
    DROP CONSTRAINT IF EXISTS "mdm_master_data_tenant_id_fkey";
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE mdm_industrial_approvals."mdm_master_data"
    ADD CONSTRAINT "mdm_master_data_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES public."tenants"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  `);

  await seedTenants(prisma);

  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('public."tenant_projects"', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM public."tenant_projects"), 1), 1),
      COALESCE((SELECT MAX(id) FROM public."tenant_projects"), 0) > 0
    );
  `);

  console.log('Tenant schema applied successfully.');
}

main()
  .catch((error) => {
    console.error('Failed to apply tenant schema:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
