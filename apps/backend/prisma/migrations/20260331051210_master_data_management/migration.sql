-- CreateEnum
CREATE TYPE "MasterDataUploadStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "mdm_projects" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "schema_name" VARCHAR(63) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_sub_departments" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "m_sub_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_master_definitions" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "schema_name" VARCHAR(63) NOT NULL,
    "table_name" VARCHAR(63) NOT NULL,
    "supports_hierarchy" BOOLEAN NOT NULL DEFAULT true,
    "has_validity_period" BOOLEAN NOT NULL DEFAULT true,
    "map_department" BOOLEAN NOT NULL DEFAULT false,
    "map_sub_department" BOOLEAN NOT NULL DEFAULT false,
    "default_department_id" INTEGER,
    "default_sub_department_id" INTEGER,
    "valid_from" DATE,
    "valid_to" DATE,
    "master_table_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_master_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdm_master_upload_batches" (
    "id" SERIAL NOT NULL,
    "master_definition_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "status" "MasterDataUploadStatus" NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "successful_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "error_report" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdm_master_upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mdm_projects_code_key" ON "mdm_projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_projects_schema_name_key" ON "mdm_projects"("schema_name");

-- CreateIndex
CREATE INDEX "idx_sub_departments_department_id" ON "m_sub_departments"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_sub_department_department_name" ON "m_sub_departments"("department_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mdm_master_definitions_master_table_id_key" ON "mdm_master_definitions"("master_table_id");

-- CreateIndex
CREATE INDEX "idx_master_definition_project_id" ON "mdm_master_definitions"("project_id");

-- CreateIndex
CREATE INDEX "idx_master_definition_department_id" ON "mdm_master_definitions"("default_department_id");

-- CreateIndex
CREATE INDEX "idx_master_definition_sub_department_id" ON "mdm_master_definitions"("default_sub_department_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_master_definition_project_code" ON "mdm_master_definitions"("project_id", "code");

-- CreateIndex
CREATE INDEX "idx_master_upload_master_definition_id" ON "mdm_master_upload_batches"("master_definition_id");

-- AddForeignKey
ALTER TABLE "m_sub_departments" ADD CONSTRAINT "m_sub_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "m_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_definitions" ADD CONSTRAINT "mdm_master_definitions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "mdm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_definitions" ADD CONSTRAINT "mdm_master_definitions_default_department_id_fkey" FOREIGN KEY ("default_department_id") REFERENCES "m_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_definitions" ADD CONSTRAINT "mdm_master_definitions_default_sub_department_id_fkey" FOREIGN KEY ("default_sub_department_id") REFERENCES "m_sub_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_definitions" ADD CONSTRAINT "mdm_master_definitions_master_table_id_fkey" FOREIGN KEY ("master_table_id") REFERENCES "master_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdm_master_upload_batches" ADD CONSTRAINT "mdm_master_upload_batches_master_definition_id_fkey" FOREIGN KEY ("master_definition_id") REFERENCES "mdm_master_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
