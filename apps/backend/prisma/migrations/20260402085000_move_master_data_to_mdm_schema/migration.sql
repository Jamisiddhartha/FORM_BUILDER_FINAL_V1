-- Drop foreign keys first (if any exist from old tables)
ALTER TABLE IF EXISTS "mdm_master_data_references" DROP CONSTRAINT IF EXISTS "mdm_master_data_references_from_data_id_fkey";
ALTER TABLE IF EXISTS "mdm_master_data_references" DROP CONSTRAINT IF EXISTS "mdm_master_data_references_to_data_id_fkey";
ALTER TABLE IF EXISTS "mdm_master_column_definitions" DROP CONSTRAINT IF EXISTS "mdm_master_column_definitions_master_id_fkey";
ALTER TABLE IF EXISTS "mdm_master_data" DROP CONSTRAINT IF EXISTS "mdm_master_data_master_id_fkey";

-- Drop tables from public schema
DROP TABLE IF EXISTS "mdm_master_data_references";
DROP TABLE IF EXISTS "mdm_master_data";
DROP TABLE IF EXISTS "mdm_master_column_definitions";
DROP TABLE IF EXISTS "mdm_master_definitions_v2";
DROP TYPE IF EXISTS "ColumnDataType";

-- Create the enum in mdm_industrial_approvals schema
CREATE TYPE mdm_industrial_approvals."ColumnDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT', 'FILE');

-- Create tables in mdm_industrial_approvals schema
CREATE TABLE mdm_industrial_approvals."mdm_master_definitions_v2" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "allow_import" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_master_definitions_v2_pkey" PRIMARY KEY ("id")
);

CREATE TABLE mdm_industrial_approvals."mdm_master_column_definitions" (
    "id" SERIAL NOT NULL,
    "master_id" INTEGER NOT NULL,
    "column_key" VARCHAR(100) NOT NULL,
    "column_label" VARCHAR(255) NOT NULL,
    "data_type" mdm_industrial_approvals."ColumnDataType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_unique" BOOLEAN NOT NULL DEFAULT false,
    "is_searchable" BOOLEAN NOT NULL DEFAULT true,
    "is_listable" BOOLEAN NOT NULL DEFAULT true,
    "is_filterable" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "validation" JSONB,
    "default_value" VARCHAR(255),
    "placeholder" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_master_column_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE mdm_industrial_approvals."mdm_master_data" (
    "id" BIGSERIAL NOT NULL,
    "master_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(100),
    "updated_by" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_master_data_pkey" PRIMARY KEY ("id")
);

CREATE TABLE mdm_industrial_approvals."mdm_master_data_references" (
    "id" BIGSERIAL NOT NULL,
    "from_data_id" BIGINT NOT NULL,
    "to_data_id" BIGINT NOT NULL,
    "column_key" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_master_data_references_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "idx_master_def_v2_tenant_id" ON mdm_industrial_approvals."mdm_master_definitions_v2"("tenant_id");
CREATE INDEX "idx_master_def_v2_project_id" ON mdm_industrial_approvals."mdm_master_definitions_v2"("project_id");
CREATE INDEX "idx_master_def_v2_is_active" ON mdm_industrial_approvals."mdm_master_definitions_v2"("is_active");
CREATE UNIQUE INDEX "uniq_master_def_v2_tenant_code" ON mdm_industrial_approvals."mdm_master_definitions_v2"("tenant_id", "code");

CREATE INDEX "idx_master_column_def_master_id" ON mdm_industrial_approvals."mdm_master_column_definitions"("master_id");
CREATE UNIQUE INDEX "uniq_master_column_def_master_column_key" ON mdm_industrial_approvals."mdm_master_column_definitions"("master_id", "column_key");

CREATE INDEX "idx_master_data_master_is_active" ON mdm_industrial_approvals."mdm_master_data"("master_id", "is_active");
CREATE INDEX "idx_master_data_master_tenant" ON mdm_industrial_approvals."mdm_master_data"("master_id", "tenant_id");
CREATE INDEX "idx_master_data_tenant_id" ON mdm_industrial_approvals."mdm_master_data"("tenant_id");

CREATE UNIQUE INDEX "uniq_master_data_reference_from_to_column" ON mdm_industrial_approvals."mdm_master_data_references"("from_data_id", "to_data_id", "column_key");
CREATE INDEX "idx_master_data_reference_from_data_id" ON mdm_industrial_approvals."mdm_master_data_references"("from_data_id");
CREATE INDEX "idx_master_data_reference_to_data_id" ON mdm_industrial_approvals."mdm_master_data_references"("to_data_id");

-- Add foreign key constraints
ALTER TABLE mdm_industrial_approvals."mdm_master_column_definitions" ADD CONSTRAINT "mdm_master_column_definitions_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES mdm_industrial_approvals."mdm_master_definitions_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE mdm_industrial_approvals."mdm_master_data" ADD CONSTRAINT "mdm_master_data_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES mdm_industrial_approvals."mdm_master_definitions_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE mdm_industrial_approvals."mdm_master_data_references" ADD CONSTRAINT "mdm_master_data_references_from_data_id_fkey" FOREIGN KEY ("from_data_id") REFERENCES mdm_industrial_approvals."mdm_master_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE mdm_industrial_approvals."mdm_master_data_references" ADD CONSTRAINT "mdm_master_data_references_to_data_id_fkey" FOREIGN KEY ("to_data_id") REFERENCES mdm_industrial_approvals."mdm_master_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;
