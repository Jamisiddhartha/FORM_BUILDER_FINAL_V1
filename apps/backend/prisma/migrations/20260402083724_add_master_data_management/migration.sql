-- CreateEnum
CREATE TYPE "ColumnDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT', 'FILE');

-- CreateTable
CREATE TABLE "mdm_master_definitions_v2" (
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

-- CreateTable
CREATE TABLE "mdm_master_column_definitions" (
    "id" SERIAL NOT NULL,
    "master_id" INTEGER NOT NULL,
    "column_key" VARCHAR(100) NOT NULL,
    "column_label" VARCHAR(255) NOT NULL,
    "data_type" "ColumnDataType" NOT NULL,
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

-- CreateTable
CREATE TABLE "mdm_master_data" (
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

-- CreateTable
CREATE TABLE "mdm_master_data_references" (
    "id" BIGSERIAL NOT NULL,
    "from_data_id" BIGINT NOT NULL,
    "to_data_id" BIGINT NOT NULL,
    "column_key" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_master_data_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_master_def_v2_tenant_id" ON "mdm_master_definitions_v2"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_master_def_v2_project_id" ON "mdm_master_definitions_v2"("project_id");

-- CreateIndex
CREATE INDEX "idx_master_def_v2_is_active" ON "mdm_master_definitions_v2"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_master_def_v2_tenant_code" ON "mdm_master_definitions_v2"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "idx_master_column_def_master_id" ON "mdm_master_column_definitions"("master_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_master_column_def_master_column_key" ON "mdm_master_column_definitions"("master_id", "column_key");

-- CreateIndex
CREATE INDEX "idx_master_data_master_is_active" ON "mdm_master_data"("master_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_master_data_master_tenant" ON "mdm_master_data"("master_id", "tenant_id");

-- CreateIndex
CREATE INDEX "idx_master_data_tenant_id" ON "mdm_master_data"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_master_data_reference_from_data_id" ON "mdm_master_data_references"("from_data_id");

-- CreateIndex
CREATE INDEX "idx_master_data_reference_to_data_id" ON "mdm_master_data_references"("to_data_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_master_data_reference_from_to_column" ON "mdm_master_data_references"("from_data_id", "to_data_id", "column_key");

-- AddForeignKey
ALTER TABLE "mdm_master_column_definitions" ADD CONSTRAINT "mdm_master_column_definitions_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "mdm_master_definitions_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_data" ADD CONSTRAINT "mdm_master_data_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "mdm_master_definitions_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_data_references" ADD CONSTRAINT "mdm_master_data_references_from_data_id_fkey" FOREIGN KEY ("from_data_id") REFERENCES "mdm_master_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_data_references" ADD CONSTRAINT "mdm_master_data_references_to_data_id_fkey" FOREIGN KEY ("to_data_id") REFERENCES "mdm_master_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;
