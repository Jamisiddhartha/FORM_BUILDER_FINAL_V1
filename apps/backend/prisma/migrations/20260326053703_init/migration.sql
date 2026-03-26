-- CreateEnum
CREATE TYPE "user_type" AS ENUM ('INVESTOR', 'DEPARTMENT', 'CIS_USER', 'INSPECTOR', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "user_token_type" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "user_log_type" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED', 'EMAIL_VERIFICATION_SENT', 'EMAIL_VERIFIED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED');

-- CreateEnum
CREATE TYPE "payment_status_code" AS ENUM ('F', 'S');

-- CreateEnum
CREATE TYPE "yn_flag" AS ENUM ('Y', 'N');

-- CreateEnum
CREATE TYPE "OptionSourceType" AS ENUM ('STATIC', 'MASTER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ONLINE_ON_DEPT_PORTAL', 'INTEGRATED', 'ONBOARDED', 'OFFLINE', 'NOT_APPLICABLE', 'INCENTIVE');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('U', 'V', 'R', 'M');

-- CreateEnum
CREATE TYPE "active_status" AS ENUM ('Y', 'N');

-- CreateEnum
CREATE TYPE "ActPolicyNotificationType" AS ENUM ('Act', 'Policy', 'Notification');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('PENDING_ALLOCATION', 'ALLOCATED', 'SCHEDULED', 'IN_PROGRESS', 'OBSERVATIONS_LOGGED', 'APPLICANT_RESPONSE_PENDING', 'PENDING_APPROVAL', 'FINALIZATION', 'REPORT_PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('OPEN', 'NEEDS_INFO', 'RESOLVED', 'CLOSED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "InspectorType" AS ENUM ('DEPARTMENT_OFFICIAL', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ProcessingLevel" AS ENUM ('District', 'State');

-- CreateEnum
CREATE TYPE "WorkflowConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JurisdictionLevel" AS ENUM ('STATE', 'DISTRICT', 'BLOCK', 'TEHSIL', 'GRAM_PANCHAYAT', 'VILLAGE');

-- CreateEnum
CREATE TYPE "AssignmentStrategy" AS ENUM ('ROLE', 'USER', 'OFFICE', 'RULE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PAYMENT', 'PAYMENT_DONE', 'FORWARDED', 'FORWARDED_DISTRICT', 'FORWARDED_DEPARTMENT', 'RAISE_QUERY', 'REVERTED', 'REVERT_BACK', 'APPROVED', 'CONDITIONALLY_APPROVE', 'REJECTED', 'FORWARDED_TO_SLEC', 'FORWARD_FOR_DISBURSEMENT', 'DISBURSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('V', 'P');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('Y', 'N');

-- CreateEnum
CREATE TYPE "DocumentStatusCommonIncentive" AS ENUM ('Y', 'N');

-- CreateEnum
CREATE TYPE "DocumentApproveStatus" AS ENUM ('REJECT', 'PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('recommended', 'not_recommended');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255),
    "password_hash" TEXT,
    "salt" VARCHAR(255),
    "password_algo" VARCHAR(50) NOT NULL DEFAULT 'argon2',
    "user_type" "user_type" NOT NULL DEFAULT 'INVESTOR',
    "role_id" INTEGER,
    "is_email_verified" SMALLINT NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_countries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "boCountryId" INTEGER,
    "lrId" INTEGER,
    "hadbastNumber" INTEGER,
    "vtcCode" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "user_type" "user_type" NOT NULL,
    "email" VARCHAR(255),
    "log_type" "user_log_type" NOT NULL,
    "description" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "session_id" VARCHAR(128),
    "token_id" BIGINT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_states" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "countryId" INTEGER NOT NULL,
    "boStateId" INTEGER,
    "boLgdId" INTEGER,
    "stateCode" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_districts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" VARCHAR(255),
    "districtCode" VARCHAR(255),
    "stateId" INTEGER NOT NULL,
    "abbreviation" VARCHAR(255),
    "latlong" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_blocks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,
    "unitCategory" VARCHAR(10),
    "districtCode" VARCHAR(255),
    "lgCodeDistrictId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_tehsils" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,
    "subDistrictCode" TEXT,
    "deptDivisionId" INTEGER,
    "lgDistrictId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_tehsils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_villages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tehsilId" INTEGER NOT NULL,
    "villageCode" TEXT NOT NULL,
    "subDistrictCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_villages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "uniqueTag" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "boDeptId" INTEGER,
    "order" INTEGER,
    "icon" TEXT,
    "deptType" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "issuerId" INTEGER,

    CONSTRAINT "m_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_issuers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isIssuerActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_issuers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_documenttypes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "isDocActive" BOOLEAN NOT NULL DEFAULT true,
    "isFormatRequired" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_documenttypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_form_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_fb_form_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_form_categories" (
    "id" SERIAL NOT NULL,
    "category_name" TEXT NOT NULL,
    "name_in_hindi" TEXT,
    "name" TEXT,
    "parent_id" INTEGER NOT NULL DEFAULT 0,
    "category_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3),
    "modified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_fb_form_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_form_field" (
    "id" SERIAL NOT NULL,
    "formchk_id" TEXT NOT NULL,
    "parent_id" INTEGER NOT NULL DEFAULT 0,
    "category_id" INTEGER,
    "name" TEXT NOT NULL,
    "name_in_hindi" TEXT,
    "is_editable" TEXT NOT NULL DEFAULT 'Y',
    "created_date" TIMESTAMP(3),
    "is_formvar_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_fb_form_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_form_mapping" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "service_id" VARCHAR(10) NOT NULL,
    "form_type_id" INTEGER NOT NULL,
    "form_name" VARCHAR(255) NOT NULL,
    "form_code" VARCHAR(255) NOT NULL,
    "form_version" VARCHAR(10),
    "is_active" "yn_flag" NOT NULL DEFAULT 'Y',
    "created" TIMESTAMP(3),
    "modified" TIMESTAMP(3),

    CONSTRAINT "m_fb_form_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_page_master" (
    "id" SERIAL NOT NULL,
    "service_id" VARCHAR(255) NOT NULL,
    "page_name" VARCHAR(255) NOT NULL,
    "is_active" "yn_flag" NOT NULL DEFAULT 'Y',
    "name_in_hindi" VARCHAR(255),
    "preference" INTEGER NOT NULL,
    "form_id" INTEGER NOT NULL,
    "form_code" VARCHAR(250),
    "created" TIMESTAMP(3),
    "modified" TIMESTAMP(3),

    CONSTRAINT "m_fb_page_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_page_category_mapping" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "preference" INTEGER NOT NULL,
    "help_text" VARCHAR(500),
    "is_active" "yn_flag" NOT NULL DEFAULT 'Y',

    CONSTRAINT "m_fb_page_category_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_form_builder_fields" (
    "id" SERIAL NOT NULL,
    "service_id" TEXT NOT NULL,
    "form_id" INTEGER NOT NULL,
    "page_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "form_field_id" INTEGER NOT NULL,
    "preference" INTEGER NOT NULL,
    "input_type" TEXT NOT NULL,
    "custom_label" TEXT,
    "help_text" TEXT,
    "placeholder" TEXT,
    "grid_span" INTEGER NOT NULL DEFAULT 12,
    "layout_type" TEXT,
    "component_props" JSONB,
    "is_required" "yn_flag" NOT NULL DEFAULT 'N',
    "is_editable" "yn_flag" NOT NULL DEFAULT 'Y',
    "is_readonly" "yn_flag" NOT NULL DEFAULT 'N',
    "is_active" "yn_flag" NOT NULL DEFAULT 'Y',
    "min_length" INTEGER,
    "max_length" INTEGER,
    "pattern" TEXT,
    "step" TEXT,
    "row_type" TEXT,
    "validation_rule" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3),

    CONSTRAINT "m_fb_form_builder_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_formfield_options" (
    "id" SERIAL NOT NULL,
    "builder_field_id" INTEGER NOT NULL,
    "source_type" "OptionSourceType" NOT NULL,
    "master_table_id" INTEGER,
    "static_options" JSONB,
    "parent_builder_field_id" INTEGER,
    "is_active" "yn_flag" NOT NULL DEFAULT 'Y',
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3),

    CONSTRAINT "m_fb_formfield_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_config_values" (
    "id" SERIAL NOT NULL,
    "use_for" VARCHAR(255),
    "field_code" VARCHAR(255),
    "table_name" VARCHAR(255),
    "service_id" CHAR(20) NOT NULL DEFAULT '0',
    "raw_query" TEXT,
    "isActive" CHAR(1) NOT NULL DEFAULT 't',

    CONSTRAINT "m_fb_config_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_addmore_groups" (
    "id" SERIAL NOT NULL,
    "service_id" TEXT NOT NULL,
    "form_id" INTEGER NOT NULL,
    "page_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "trigger_builder_field_id" INTEGER NOT NULL,
    "label" TEXT,
    "min_rows" INTEGER DEFAULT 1,
    "max_rows" INTEGER,
    "is_active" "yn_flag" NOT NULL DEFAULT 'Y',
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3),

    CONSTRAINT "m_fb_addmore_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_addmore_columns" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "builder_field_id" INTEGER NOT NULL,
    "col_order" INTEGER NOT NULL,

    CONSTRAINT "m_fb_addmore_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_fb_form_rules" (
    "id" SERIAL NOT NULL,
    "service_id" TEXT NOT NULL,
    "form_id" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "when_json" JSONB NOT NULL,
    "then_json" JSONB NOT NULL,
    "is_active" "yn_flag" NOT NULL DEFAULT 'Y',
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3),

    CONSTRAINT "m_fb_form_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_document_checkpoints" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3),
    "modified" TIMESTAMP(3),
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_document_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_document_master" (
    "id" SERIAL NOT NULL,
    "checklistId" TEXT NOT NULL,
    "stateId" INTEGER NOT NULL,
    "issuerId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "documentTypeId" INTEGER,
    "issuerById" INTEGER,
    "checklistDocumentName" TEXT NOT NULL,
    "checklistDocumentExtension" TEXT NOT NULL,
    "checklistDocumentMaxSize" INTEGER NOT NULL,
    "prescribedDocumentPath" TEXT,
    "services" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "documentCheckpoints" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "isMultiVersionAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isDocValidityRequired" BOOLEAN NOT NULL DEFAULT false,
    "isDocReferenceNumberRequired" BOOLEAN NOT NULL DEFAULT false,
    "isAutoInsertAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isDocActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_document_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_profiles" (
    "id" BIGSERIAL NOT NULL,
    "uid" VARCHAR(255) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(64),
    "pan_card" VARCHAR(16),
    "adhaar_number" VARCHAR(12),
    "country_name" VARCHAR(64) NOT NULL,
    "state_name" VARCHAR(64) NOT NULL,
    "city_name" VARCHAR(64) NOT NULL,
    "district_name" VARCHAR(100) NOT NULL,
    "pin_code" VARCHAR(10) NOT NULL,
    "address" TEXT NOT NULL,
    "mobile_number" BIGINT NOT NULL,
    "legal_entity_name" VARCHAR(255),
    "cons_pan_card" VARCHAR(255),
    "cons_first_name" VARCHAR(255),
    "cons_last_name" VARCHAR(255),
    "cons_mobile_number" VARCHAR(255),
    "cons_email" VARCHAR(255),
    "cons_country_name" VARCHAR(255),
    "cons_state_name" VARCHAR(255),
    "project_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_users" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "full_name" VARCHAR(60) NOT NULL,
    "hindi_full_name" VARCHAR(255),
    "email" VARCHAR(128) NOT NULL,
    "office_no" VARCHAR(15),
    "mobile" VARCHAR(16),
    "dept_id" INTEGER NOT NULL,
    "district_id" INTEGER,
    "tahsil_id" INTEGER NOT NULL DEFAULT 0,
    "circle_id" VARCHAR(255),
    "block_id" INTEGER NOT NULL DEFAULT 0,
    "office_id" INTEGER NOT NULL DEFAULT 0,
    "division_id" INTEGER NOT NULL DEFAULT 0,
    "delegate_officer_number" VARCHAR(16),
    "delegate_officer_name" VARCHAR(255),
    "delegate_officer_email" VARCHAR(255),
    "np_user_id" VARCHAR(255),
    "is_for_testing" SMALLINT NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "token_type" "user_token_type" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(150) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_resources" (
    "id" BIGSERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "resource_id" BIGINT NOT NULL,

    CONSTRAINT "role_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_field" (
    "id" SERIAL NOT NULL,
    "field_code" VARCHAR(50) NOT NULL,
    "field_label" VARCHAR(255) NOT NULL,
    "data_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_policy" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "policy_name" VARCHAR(255) NOT NULL,
    "policy_code" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_scheme_definitions" (
    "id" SERIAL NOT NULL,
    "policy_id" INTEGER NOT NULL,
    "service_id" TEXT NOT NULL,
    "scheme_name" VARCHAR(255) NOT NULL,
    "scheme_code" VARCHAR(100) NOT NULL,
    "cascading_config" JSONB NOT NULL DEFAULT '{}',
    "pop_message_config" JSONB NOT NULL DEFAULT '{}',
    "form_structure_json" JSONB NOT NULL,
    "required_documents" JSONB NOT NULL DEFAULT '[]',
    "calculation_logic" JSONB NOT NULL,
    "workflow_config" JSONB NOT NULL DEFAULT '{}',
    "admin_view_config" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current_version" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m_scheme_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_tables" (
    "id" SERIAL NOT NULL,
    "master_name" VARCHAR(100) NOT NULL,
    "master_code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "table_name" VARCHAR(100) NOT NULL,
    "schema_name" VARCHAR(50) NOT NULL DEFAULT 'public',
    "value_column" VARCHAR(100) NOT NULL,
    "label_column" VARCHAR(100) NOT NULL,
    "secondary_label" VARCHAR(100),
    "label_template" VARCHAR(255),
    "is_active_column" VARCHAR(100),
    "is_active_value" VARCHAR(50),
    "default_filter" JSONB,
    "default_order_by" VARCHAR(100),
    "parent_master_id" INTEGER,
    "parent_column" VARCHAR(100),
    "api_endpoint" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" VARCHAR(100),

    CONSTRAINT "master_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_servicetype" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_servicetype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_servicesector" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_servicesector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_workflow_jurisdiction_level" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_workflow_jurisdiction_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_workflow_assignment_strategy" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_workflow_assignment_strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_workflow_action_master" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_workflow_action_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_serviceincidence" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_serviceincidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_issuerby" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_issuerby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_service" (
    "id" SERIAL NOT NULL,
    "service_id" TEXT,
    "department_id" INTEGER,
    "issuer_id" INTEGER,
    "swcs_service_id" INTEGER,
    "service_level" TEXT,
    "document_checklist" CHAR(1),
    "document_checklist_mapping" JSONB,
    "document_type_mapping" JSONB,
    "document_checkpoint_mapping" JSONB,
    "dms" JSONB,
    "comments" TEXT,
    "service_name" TEXT,
    "name_in_hindi" TEXT,
    "service_url" TEXT,
    "development_url" TEXT,
    "is_in_SWCS_act" BOOLEAN NOT NULL DEFAULT false,
    "is_integrated_with_dms" BOOLEAN NOT NULL DEFAULT false,
    "service_status" "ServiceStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "user_agent" TEXT,
    "ipaddress" TEXT,
    "is_caf_required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "service_go_live_date" TIMESTAMP(3),
    "service_end_date" TIMESTAMP(3),

    CONSTRAINT "m_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorDocument" (
    "id" BIGSERIAL NOT NULL,
    "documentMasterId" INTEGER NOT NULL,
    "documentTypeId" INTEGER NOT NULL,
    "issuerId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "investorProfileUid" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "documentReferenceNumber" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentVersion" TEXT NOT NULL DEFAULT 'V1.0',
    "documentStatus" "document_status" NOT NULL DEFAULT 'U',
    "isDocumentActive" "active_status" NOT NULL DEFAULT 'Y',
    "documentPath" TEXT NOT NULL,
    "validFrom" DATE,
    "validTo" DATE,
    "documentDateOfIssuance" DATE,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_unit_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_land_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_land_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_sectors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_sub_sectors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sectorId" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_sub_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_msme_year" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_msme_year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_unit_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "msmeYearId" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_unit_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_anchor_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_anchor_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_region_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_region_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_mapping_region_categories" (
    "id" SERIAL NOT NULL,
    "blockId" INTEGER NOT NULL,
    "regionCategoryId" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_mapping_region_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_nic_code" (
    "ID" INTEGER NOT NULL,
    "NIC_II_Digit" VARCHAR(10),
    "NIC_IV_Digit" VARCHAR(10),
    "NIC_V_Digit" VARCHAR(10),
    "Description" TEXT NOT NULL,
    "is_active" VARCHAR(1) NOT NULL,

    CONSTRAINT "m_nic_code_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "m_hsn_code" (
    "id" INTEGER NOT NULL,
    "hsn_code" VARCHAR(20) NOT NULL,
    "comodity_name" TEXT NOT NULL,
    "gst_rate" VARCHAR(50),
    "is_active" VARCHAR(1) NOT NULL,

    CONSTRAINT "m_hsn_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_beneficiary_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_beneficiary_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_occurrences" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_incentive_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_incentive_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_financial_parameter" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(50),
    "dataType" VARCHAR(50),
    "isCalculable" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_financial_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_kyi_ic_calculator" (
    "id" SERIAL NOT NULL,
    "benefit_percent_amount" DOUBLE PRECISION,
    "cap_limit" DOUBLE PRECISION,
    "extra_fixed_amount" DOUBLE PRECISION,
    "above_calculating_amount" DOUBLE PRECISION,
    "years_of_recurring" INTEGER,
    "eligibility_notes" VARCHAR(255),
    "description" VARCHAR(255),
    "limitation" VARCHAR(255),
    "policy_id" INTEGER,
    "msme_year_value" INTEGER,
    "unit_category_value" INTEGER,
    "unit_type_value" INTEGER,
    "sector_value" INTEGER,
    "sub_sector_value" INTEGER,
    "ocurrance_value" INTEGER,
    "block_value" INTEGER,
    "region_category_value" INTEGER,
    "land_type_value" INTEGER,
    "beneficiary_type_value" INTEGER,
    "anchor_unit_value" INTEGER,
    "incentive_mapping_id" INTEGER,
    "incentive_value" INTEGER,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" INTEGER,
    "mappingRegionCategoriesId" INTEGER,

    CONSTRAINT "m_kyi_ic_calculator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_organisation_nature" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "education_is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3),

    CONSTRAINT "m_organisation_nature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bo_api_access_log" (
    "id" BIGSERIAL NOT NULL,
    "sp_tag" VARCHAR(64),
    "request_method" VARCHAR(10) NOT NULL,
    "request_uri" TEXT NOT NULL,
    "request_time" BIGINT NOT NULL,
    "post_info" TEXT NOT NULL,
    "user_agent" VARCHAR(512),
    "remote_ip" VARCHAR(64),
    "response_return" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bo_api_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_act_policy_notification" (
    "id" SERIAL NOT NULL,
    "type" "ActPolicyNotificationType" NOT NULL DEFAULT 'Act',
    "level" TEXT,
    "name" TEXT NOT NULL,
    "brief" TEXT,
    "englishfilePath" TEXT,
    "hindifilePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "user_agent" TEXT,
    "ipaddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),

    CONSTRAINT "m_act_policy_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_act_policy_notification_departments" (
    "id" SERIAL NOT NULL,
    "actpolicynotification_id" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,

    CONSTRAINT "m_act_policy_notification_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_act_policy_notification_amendments" (
    "id" SERIAL NOT NULL,
    "actpolicynotification_id" INTEGER NOT NULL,
    "level" TEXT,
    "name" TEXT NOT NULL,
    "brief" TEXT,
    "englishfilePath" TEXT,
    "hindifilePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "user_agent" TEXT,
    "ipaddress" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_act_policy_notification_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_kya_categories" (
    "id" SERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_kya_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_questions" (
    "id" SERIAL NOT NULL,
    "m_kya_category_id" INTEGER NOT NULL,
    "question_label" VARCHAR(200) NOT NULL,
    "field_type" VARCHAR(50) NOT NULL,
    "is_dependent" BOOLEAN NOT NULL DEFAULT false,
    "parent_question_id" INTEGER,
    "kya_option_id" INTEGER,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_tooltip_available" BOOLEAN NOT NULL DEFAULT false,
    "tooltip_text" VARCHAR(500),
    "show_reference_document" BOOLEAN NOT NULL DEFAULT false,
    "url_document" VARCHAR(500),
    "user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "kya_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_options" (
    "id" SERIAL NOT NULL,
    "kya_question_id" INTEGER NOT NULL,
    "option_label" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kya_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kya_service_mappings" (
    "id" SERIAL NOT NULL,
    "kya_option_id" INTEGER NOT NULL,
    "m_service_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kya_service_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_service_details" (
    "id" SERIAL NOT NULL,
    "m_service_id" TEXT NOT NULL,
    "service_category" VARCHAR(50) NOT NULL,
    "authority_name" VARCHAR(300),
    "timeline" INTEGER,
    "sop_document" VARCHAR(200),
    "fee_structure_document" VARCHAR(200),
    "list_of_required_documents" VARCHAR(200),
    "service_type" VARCHAR(20) NOT NULL DEFAULT 'Mandatory',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_service_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_checklists" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_checklist_items" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "riskIndicator" TEXT,
    "validationRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_party_inspectors" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "recognitionId" TEXT NOT NULL,
    "organization" TEXT,
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "authorizedDistricts" TEXT[],
    "authorizedServices" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "third_party_inspectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_transactions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "application_submission_id" INTEGER,
    "district_id" INTEGER,
    "checklistId" INTEGER NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "inspectorType" "InspectorType" NOT NULL,
    "departmentInspectorId" BIGINT,
    "thirdPartyInspectorId" INTEGER,
    "inspection_type" TEXT NOT NULL DEFAULT 'SINGLE',
    "is_third_party" BOOLEAN NOT NULL DEFAULT false,
    "riskCategory" TEXT,
    "compliance_score" INTEGER,
    "inspectionDate" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "reportFinalizedAt" TIMESTAMP(3),
    "reportPublishedAt" TIMESTAMP(3),
    "reportUploadedAt" TIMESTAMP(3),
    "applicantViewedAt" TIMESTAMP(3),
    "sla_due_date" TIMESTAMP(3),
    "slaBreachWarningSent" BOOLEAN NOT NULL DEFAULT false,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "fee_details" TEXT,
    "total_fee_charge" DECIMAL(12,2),
    "fee_status" TEXT DEFAULT 'PENDING',
    "financial_year" TEXT,
    "ai_summary" TEXT,
    "allocatedBy" BIGINT,
    "allocatedAt" TIMESTAMP(3),
    "priority" TEXT DEFAULT 'NORMAL',
    "reschedule_requested" BOOLEAN NOT NULL DEFAULT false,
    "reschedule_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_observations" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "checklistItemId" INTEGER,
    "observationText" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" "ObservationStatus" NOT NULL DEFAULT 'OPEN',
    "evidenceUrl" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_observation_responses" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "responderId" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_observation_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_evidence" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "checklistItemId" INTEGER,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "geoTag" JSONB,
    "capturedAt" TIMESTAMP(3),
    "uploadedBy" BIGINT NOT NULL,
    "uploaderRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_checklist_responses" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "checklistItemId" INTEGER NOT NULL,
    "response" TEXT NOT NULL,
    "remarks" TEXT,
    "evidenceUrls" TEXT[],
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "rejectionReason" TEXT,
    "respondedBy" BIGINT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_checklist_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_feedback" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "submittedBy" BIGINT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_audit_logs" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "details" JSONB,
    "performedBy" BIGINT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "inspection_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_information_wizard" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "statuary_form_path" VARCHAR(255),
    "fee_structure_path" VARCHAR(255),
    "sop_document_path" VARCHAR(255),
    "stage_wise_timeline_path" VARCHAR(255),
    "statuary_timeline_path" VARCHAR(255),
    "statuary_timeline_text" VARCHAR(255),
    "inspection_checklist_path" VARCHAR(255),
    "risk_category" TEXT,
    "size_of_firm" TEXT,
    "business_location" TEXT,
    "investor_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_information_wizard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "c_application_workflow_configuration" (
    "id" SERIAL NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "department_id" INTEGER NOT NULL,
    "service_id" VARCHAR(20) NOT NULL,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "role_id" INTEGER NOT NULL DEFAULT 0,
    "jurisdiction_level_id" INTEGER,
    "assignment_strategy_id" INTEGER,
    "action_master_ids_json" JSONB NOT NULL DEFAULT '[]',
    "jurisdiction_level" "JurisdictionLevel" NOT NULL DEFAULT 'DISTRICT',
    "assignment_strategy" "AssignmentStrategy" NOT NULL DEFAULT 'ROLE',
    "assignment_rule_json" JSONB,
    "action_allowed_json" JSONB NOT NULL DEFAULT '[]',
    "transition_map_json" JSONB NOT NULL DEFAULT '{}',
    "sla_hours" INTEGER NOT NULL DEFAULT 0,
    "sla_breach_requires_reason" BOOLEAN NOT NULL DEFAULT true,
    "next_allocation_role_id" INTEGER,
    "created_by" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processing_level" "ProcessingLevel" NOT NULL DEFAULT 'District',
    "current_role_id" INTEGER NOT NULL,
    "form_type_id" INTEGER NOT NULL,
    "next_role_id" INTEGER NOT NULL,
    "approver_id" INTEGER NOT NULL,
    "forward_role_id" INTEGER NOT NULL,
    "revert_role_id" INTEGER NOT NULL,
    "is_delay_reason_required" "active_status" NOT NULL DEFAULT 'N',
    "time_in_hours" VARCHAR(10) NOT NULL DEFAULT '0',
    "can_revert_to_investor" "active_status" NOT NULL DEFAULT 'N',
    "can_verify_document" "active_status" NOT NULL DEFAULT 'N',
    "can_forward_to_multiple_role_id" VARCHAR(255),
    "can_forward_to_multiple_user_id" VARCHAR(255),
    "is_own_department" "active_status" NOT NULL DEFAULT 'N',
    "permissable_tab_form_id" VARCHAR(255) NOT NULL,
    "document_show_last" "active_status" NOT NULL DEFAULT 'N',
    "process_anytime" "active_status" NOT NULL DEFAULT 'N',
    "show_licenece_list" CHAR(1) NOT NULL DEFAULT '0',
    "show_field_editable_or_not" CHAR(1) NOT NULL DEFAULT '0',
    "form_service_js" VARCHAR(255) NOT NULL DEFAULT '',
    "form_action_controller" VARCHAR(255) NOT NULL DEFAULT '',
    "subform_action_name" VARCHAR(255) NOT NULL,
    "licence_number_format" VARCHAR(255),

    CONSTRAINT "c_application_workflow_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_application_submission" (
    "submission_id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL DEFAULT 12,
    "parent_sub_id" INTEGER NOT NULL,
    "service_id" VARCHAR(20) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "form_id" INTEGER,
    "approval_id" INTEGER,
    "field_value" JSONB NOT NULL,
    "unit_name" VARCHAR(255),
    "certificate_path" VARCHAR(255),
    "kml_path" VARCHAR(255),
    "application_status" VARCHAR(10) NOT NULL DEFAULT 'P',
    "workflow_config_version" INTEGER,
    "disbursement_status" VARCHAR(10),
    "application_created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "application_updated_date_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(255) NOT NULL,
    "processing_level" "ProcessingLevel" NOT NULL DEFAULT 'District',
    "landrigion_id" INTEGER NOT NULL,
    "all_landrigion_id" VARCHAR(255),
    "is_investment_verified" "active_status",
    "is_employment_verified" "active_status",
    "is_location_verified" "active_status",
    "refrence_sub_id" INTEGER,
    "ref_licenece_number" VARCHAR(255),
    "fee_of_application" VARCHAR(255),
    "image" TEXT,
    "published_by_officer_id" INTEGER,
    "published_on" TIMESTAMP(3),
    "sso_type" VARCHAR(255),
    "sso_approval_id" VARCHAR(255),
    "submitted_on" TIMESTAMP(3),
    "legacy_data_status" "active_status" NOT NULL DEFAULT 'N',
    "auto_renewal_validity_year" INTEGER,
    "tourism_ref_number" INTEGER NOT NULL DEFAULT 0,
    "appeal_id" BIGINT,
    "business_entity_code" VARCHAR(255),
    "withdrawn_date" TIMESTAMP(3),
    "deemed_approved" CHAR(1),
    "unit_panno" VARCHAR(255),
    "unit_panno_updated_date" TIMESTAMP(3),
    "is_msmeapp_2015_active" CHAR(1) DEFAULT '1',
    "ubu_id" VARCHAR(255),

    CONSTRAINT "t_application_submission_pkey" PRIMARY KEY ("submission_id")
);

-- CreateTable
CREATE TABLE "t_workflow_instance" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "workflow_definition_version" INTEGER NOT NULL,
    "current_step" INTEGER NOT NULL,
    "current_role_id" INTEGER NOT NULL,
    "jurisdiction_level" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_workflow_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_workflow_audit" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "from_step" INTEGER,
    "to_step" INTEGER,
    "action" VARCHAR(64) NOT NULL,
    "actor_user_id" BIGINT NOT NULL,
    "remarks" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_workflow_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_forward_application" (
    "appr_lvl_id" SERIAL NOT NULL,
    "next_role_id" INTEGER,
    "next_user_id" INTEGER,
    "verifier_user_id" INTEGER DEFAULT 0,
    "app_Sub_id" INTEGER,
    "forwarded_dept_id" INTEGER,
    "forwarded_dist_id" INTEGER,
    "form_id" INTEGER,
    "post_info" TEXT,
    "action_taken" VARCHAR(255),
    "action_status" VARCHAR(10),
    "verifier_user_comment" TEXT,
    "supportive_document" VARCHAR(255),
    "created_on" TIMESTAMP(3) NOT NULL,
    "updated_date_time" TIMESTAMP(3),
    "user_agent" VARCHAR(255) NOT NULL,
    "comment_date" TIMESTAMP(3),
    "inspection_date" TIMESTAMP(3),
    "inspection_start_date" TIMESTAMP(3),
    "inspection_end_date" TIMESTAMP(3),
    "reason_for_delay" TEXT,
    "support_document" VARCHAR(255),
    "inspection_report" VARCHAR(255),
    "education_aakhya_document" VARCHAR(255),
    "ip_address" VARCHAR(255),
    "approv_status" CHAR(2) DEFAULT 'P',
    "scrutiny_commitee_meeting_date" TIMESTAMP(3),
    "claim_receipt" VARCHAR(255),
    "line_dept_caf_approval_status" INTEGER,
    "geo_report" VARCHAR(255),
    "mega_incentive_claimed_amount" VARCHAR(255),
    "row_rejection_code" INTEGER,
    "evaluation_matrix_document" VARCHAR(255),

    CONSTRAINT "t_forward_application_pkey" PRIMARY KEY ("appr_lvl_id")
);

-- CreateTable
CREATE TABLE "t_application_history" (
    "history_id" SERIAL NOT NULL,
    "sno" INTEGER,
    "service_id" VARCHAR(20),
    "sp_tag" VARCHAR(250) NOT NULL,
    "app_id" VARCHAR(250) NOT NULL,
    "application_status" VARCHAR(200) NOT NULL,
    "comments" TEXT,
    "approver_id" VARCHAR(200),
    "approver_details" VARCHAR(200),
    "next_approver" VARCHAR(200),
    "added_date_time" TIMESTAMP(3) NOT NULL,
    "sent_dated_time" TIMESTAMP(3),
    "role_id" VARCHAR(50),
    "role_name" VARCHAR(255),
    "role_user_info" VARCHAR(255),
    "next_role_id" VARCHAR(255),
    "param_1" VARCHAR(255),
    "param_2" VARCHAR(255),
    "param_3" VARCHAR(255),
    "param_4" VARCHAR(255),
    "param_5" VARCHAR(255),
    "remote_server" VARCHAR(255),
    "user_agent" VARCHAR(255),
    "certificate_no" VARCHAR(255),
    "certificate_issue_date" TIMESTAMP(3),
    "certificate_expire_date" TIMESTAMP(3),

    CONSTRAINT "t_application_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "t_sp_applications" (
    "sno" SERIAL NOT NULL,
    "sp_tag" VARCHAR(255) NOT NULL,
    "sp_app_id" VARCHAR(20) NOT NULL,
    "app_id" BIGINT NOT NULL,
    "app_name" VARCHAR(255) NOT NULL,
    "app_fields" JSONB NOT NULL,
    "app_status" VARCHAR(10) NOT NULL,
    "bo_new_disbursement_status" VARCHAR(10),
    "app_comments" TEXT NOT NULL,
    "app_distt" VARCHAR(200) NOT NULL,
    "app_distt_name" VARCHAR(150) NOT NULL,
    "app_location" TEXT NOT NULL,
    "is_applied_by_caf" "active_status",
    "caf_id" INTEGER NOT NULL,
    "caf_type" VARCHAR(10),
    "unit_name" VARCHAR(255) NOT NULL,
    "reverted_call_back_url" TEXT NOT NULL,
    "print_app_call_back_url" TEXT NOT NULL,
    "download_certificate_call_back_url" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL,
    "updated_on" TIMESTAMP(3) NOT NULL,
    "is_active" "active_status" NOT NULL,
    "remote_server" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(255) NOT NULL,
    "param_1" BIGINT NOT NULL,
    "param_2" VARCHAR(200) NOT NULL,
    "param_3" VARCHAR(200) NOT NULL,
    "param_4" VARCHAR(200) NOT NULL,
    "param_5" VARCHAR(200) NOT NULL,
    "p_head_code" VARCHAR(200),
    "p_treas_code" VARCHAR(200),
    "p_ddo_code" VARCHAR(200),
    "is_offline_application" "active_status" NOT NULL DEFAULT 'N',
    "offline_application_id" BIGINT,
    "timeline_ref" VARCHAR(100),
    "created_date_time" TIMESTAMP(3),
    "last_updated_date_time" TIMESTAMP(3),
    "assigned_to" VARCHAR(255),
    "circle_id" INTEGER,
    "tehsil_id" INTEGER,
    "block_id" INTEGER,
    "noe" INTEGER,
    "dept_portal_app_id" VARCHAR(255),
    "is_uploaded_signed_certificate" "active_status",
    "infowiz_service_id" CHAR(10),
    "legacy_captured_date" TIMESTAMP(3),
    "deemed_approved" CHAR(1),
    "certificate_no" VARCHAR(255),
    "certificate_issue_date" TIMESTAMP(3),
    "certificate_expire_date" TIMESTAMP(3),

    CONSTRAINT "t_sp_applications_pkey" PRIMARY KEY ("sno")
);

-- CreateTable
CREATE TABLE "t_application_dms_documents_mapping" (
    "mapping_id" SERIAL NOT NULL,
    "iuid" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "sno" BIGINT NOT NULL,
    "service_id" TEXT,
    "dept_id" INTEGER NOT NULL,
    "documents_id" INTEGER NOT NULL,
    "document_file_name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(10) NOT NULL,
    "ip_address" VARCHAR(100),
    "user_agent" VARCHAR(255),
    "created_on" TIMESTAMP(3) NOT NULL,
    "last_updated" TIMESTAMP(3),
    "comments" TEXT,
    "is_uploaded_flag" INTEGER,

    CONSTRAINT "t_application_dms_documents_mapping_pkey" PRIMARY KEY ("mapping_id")
);

-- CreateTable
CREATE TABLE "bo_application_dms_documents_mapping_logs" (
    "d" BIGSERIAL NOT NULL,
    "mapping_id" BIGINT NOT NULL,
    "documents_id" BIGINT NOT NULL,
    "status" VARCHAR(1) NOT NULL DEFAULT 'U',
    "dept_user_id" INTEGER NOT NULL,
    "verifier_name" VARCHAR(100),
    "verifier_designation" VARCHAR(100),
    "verifier_comments" VARCHAR(255),
    "created_time" TIMESTAMP(3) NOT NULL,
    "is_draft" VARCHAR(1) NOT NULL DEFAULT '0',
    "remote_ip" VARCHAR(20),
    "user_agent" VARCHAR(255),

    CONSTRAINT "bo_application_dms_documents_mapping_logs_pkey" PRIMARY KEY ("d")
);

-- CreateTable
CREATE TABLE "t_payment_detail" (
    "payment_id" BIGSERIAL NOT NULL,
    "pgMeTrnRefNo" BIGINT,
    "orderId" BIGINT,
    "authNStatus" VARCHAR(250),
    "authZStatus" VARCHAR(250),
    "responseCode" VARCHAR(250),
    "bank_reference_bank" VARCHAR(255),
    "user_id" INTEGER NOT NULL,
    "application_id" INTEGER NOT NULL,
    "app_sub_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "surcharge" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "trnReqDate" VARCHAR(100) NOT NULL,
    "statusCode" "payment_status_code" NOT NULL,
    "status_description" VARCHAR(500) NOT NULL,
    "Txn_Msg" VARCHAR(255) NOT NULL,
    "Txn_Status" VARCHAR(255) NOT NULL,
    "Txn_Err_Msg" VARCHAR(255) NOT NULL,
    "Clnt_Txn_Ref" VARCHAR(255) NOT NULL,
    "Clnt_Rqst_Meta" TEXT NOT NULL,
    "worldline_Merchant_Transaction_ID" VARCHAR(255) NOT NULL,
    "Hash_token" TEXT NOT NULL,
    "Token" TEXT NOT NULL,
    "worldline_Merchant_Transaction_Time" TIMESTAMP(3) NOT NULL,
    "paymentMode" VARCHAR(255),
    "created" TIMESTAMP(3) NOT NULL,
    "updated" TIMESTAMP(3),

    CONSTRAINT "t_payment_detail_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "m_upcl_supply_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_upcl_supply_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_upcl_supply_subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "supplyCategoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_upcl_supply_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_upcl_voltage" (
    "id" TEXT NOT NULL,
    "voltageGroup" TEXT NOT NULL,
    "voltageDesc" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_upcl_voltage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_ujs_divisions" (
    "id" SERIAL NOT NULL,
    "divisionId" INTEGER NOT NULL,
    "officeName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_ujs_divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_labour_factory_type_master" (
    "id" INTEGER NOT NULL,
    "factory_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_labour_factory_type_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_labour_factory_sec85" (
    "id" INTEGER NOT NULL,
    "special_provision_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_labour_factory_sec85_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_pollution_control_equipments" (
    "id" INTEGER NOT NULL,
    "equipment_name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_pollution_control_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_pollution_categories" (
    "id" SERIAL NOT NULL,
    "activity_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_pollution_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_current_landuse" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_current_landuse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_project_status" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_project_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_land_allotment_stage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_land_allotment_stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_project_status_update" (
    "id" SERIAL NOT NULL,
    "caf_id" INTEGER NOT NULL,
    "user_id" BIGINT NOT NULL,
    "last_approval_status" VARCHAR(255),
    "trial_production" TEXT,
    "category_a" VARCHAR(255),
    "category_b" VARCHAR(255),
    "category_c" VARCHAR(255),
    "category_d" VARCHAR(255),
    "male" VARCHAR(255),
    "female" VARCHAR(255),
    "others" VARCHAR(255),
    "total_employment" VARCHAR(255),
    "commercial_commencement_date" TIMESTAMP(3),
    "land_type" VARCHAR(255),
    "land_allotment_stage" VARCHAR(255),
    "project_status" VARCHAR(255),
    "current_status" VARCHAR(255),
    "not_implementation_reason" VARCHAR(255),
    "dropped_withdrawn_remarks" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_project_status_update_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m_upcl_division_subdivisions" (
    "id" SERIAL NOT NULL,
    "divisionId" TEXT NOT NULL,
    "divisionCode" TEXT NOT NULL,
    "divisionName" TEXT NOT NULL,
    "subdivisionId" TEXT NOT NULL,
    "subdivisionCode" TEXT NOT NULL,
    "subdivisionName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m_upcl_division_subdivisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_incentive_application_submission" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "incentive_id" INTEGER NOT NULL,
    "caf_id" INTEGER,
    "parent_app_id" INTEGER,
    "department_id" INTEGER NOT NULL,
    "district_id" VARCHAR(255),
    "sector_id" VARCHAR(255),
    "unit_name" VARCHAR(255),
    "registration_no" VARCHAR(255),
    "post_data" JSONB,
    "application_status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "status" "RecordStatus" NOT NULL DEFAULT 'Y',
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_on" TIMESTAMP(3) NOT NULL,
    "installment_no" INTEGER,
    "fy" VARCHAR(255),
    "certificate_number" VARCHAR(255),

    CONSTRAINT "t_incentive_application_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_incentive_application_flowlog" (
    "id" BIGSERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "current_role_id" INTEGER NOT NULL,
    "next_role_id" INTEGER,
    "user_id" INTEGER,
    "approved_amount_by_department" VARCHAR(64),
    "disbursed_amount_by_department" VARCHAR(64),
    "remarks" TEXT,
    "delay_remarks" TEXT,
    "additional_post_data" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL,
    "action_status" "ApplicationStatus" NOT NULL,
    "user_agent" VARCHAR(250),
    "remote_ip_address" VARCHAR(250),
    "status" "RecordStatus" NOT NULL DEFAULT 'Y',
    "created_date" TIMESTAMP(3),
    "modified_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file" VARCHAR(255),
    "uploaded_file_name" VARCHAR(255),
    "approved_incentive" JSONB,
    "recommendation" "RecommendationStatus",

    CONSTRAINT "t_incentive_application_flowlog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_incentive_application_document" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "application_id" INTEGER NOT NULL,
    "document_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "content" TEXT,
    "size" INTEGER NOT NULL,
    "remarks" TEXT,
    "dept_remarks" TEXT,
    "status" "DocumentStatusCommonIncentive" NOT NULL DEFAULT 'Y',
    "department_user_id" INTEGER,
    "approve_status" "DocumentApproveStatus" NOT NULL DEFAULT 'PENDING',
    "created_by" INTEGER NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by" INTEGER,
    "modified_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_incentive_application_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_user_logs_user_id" ON "user_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_logs_log_type" ON "user_logs"("log_type");

-- CreateIndex
CREATE INDEX "idx_user_logs_created_at" ON "user_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "m_departments_uniqueTag_key" ON "m_departments"("uniqueTag");

-- CreateIndex
CREATE UNIQUE INDEX "m_fb_form_types_abbr_key" ON "m_fb_form_types"("abbr");

-- CreateIndex
CREATE UNIQUE INDEX "m_fb_form_categories_category_code_key" ON "m_fb_form_categories"("category_code");

-- CreateIndex
CREATE INDEX "m_fb_form_categories_parent_id_idx" ON "m_fb_form_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_fb_form_field_formchk_id_key" ON "m_fb_form_field"("formchk_id");

-- CreateIndex
CREATE INDEX "m_fb_form_field_parent_id_idx" ON "m_fb_form_field"("parent_id");

-- CreateIndex
CREATE INDEX "m_fb_form_mapping_department_id_idx" ON "m_fb_form_mapping"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_formmapping_dept_service_formtype" ON "m_fb_form_mapping"("department_id", "service_id", "form_type_id");

-- CreateIndex
CREATE INDEX "m_fb_page_master_form_id_idx" ON "m_fb_page_master"("form_id");

-- CreateIndex
CREATE INDEX "m_fb_page_category_mapping_page_id_idx" ON "m_fb_page_category_mapping"("page_id");

-- CreateIndex
CREATE INDEX "m_fb_form_builder_fields_service_id_form_id_page_id_categor_idx" ON "m_fb_form_builder_fields"("service_id", "form_id", "page_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_fb_formfield_options_builder_field_id_key" ON "m_fb_formfield_options"("builder_field_id");

-- CreateIndex
CREATE INDEX "m_fb_config_values_service_id_isActive_idx" ON "m_fb_config_values"("service_id", "isActive");

-- CreateIndex
CREATE INDEX "m_fb_config_values_use_for_idx" ON "m_fb_config_values"("use_for");

-- CreateIndex
CREATE INDEX "m_fb_addmore_groups_service_id_form_id_page_id_category_id_idx" ON "m_fb_addmore_groups"("service_id", "form_id", "page_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_addmore_group_scope" ON "m_fb_addmore_groups"("service_id", "form_id", "page_id", "category_id", "trigger_builder_field_id");

-- CreateIndex
CREATE INDEX "m_fb_addmore_columns_group_id_idx" ON "m_fb_addmore_columns"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_addmore_column" ON "m_fb_addmore_columns"("group_id", "builder_field_id");

-- CreateIndex
CREATE INDEX "m_fb_form_rules_service_id_form_id_idx" ON "m_fb_form_rules"("service_id", "form_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_document_checkpoints_code_key" ON "m_document_checkpoints"("code");

-- CreateIndex
CREATE UNIQUE INDEX "m_document_master_checklistId_key" ON "m_document_master"("checklistId");

-- CreateIndex
CREATE INDEX "m_document_master_stateId_idx" ON "m_document_master"("stateId");

-- CreateIndex
CREATE INDEX "m_document_master_issuerId_idx" ON "m_document_master"("issuerId");

-- CreateIndex
CREATE INDEX "m_document_master_departmentId_idx" ON "m_document_master"("departmentId");

-- CreateIndex
CREATE INDEX "m_document_master_documentTypeId_idx" ON "m_document_master"("documentTypeId");

-- CreateIndex
CREATE INDEX "m_document_master_createdAt_idx" ON "m_document_master"("createdAt");

-- CreateIndex
CREATE INDEX "m_document_master_isDocActive_idx" ON "m_document_master"("isDocActive");

-- CreateIndex
CREATE UNIQUE INDEX "investor_profiles_uid_key" ON "investor_profiles"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "investor_profiles_user_id_key" ON "investor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_users_user_id_key" ON "department_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_tokens_token_hash_key" ON "user_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "resources_code_key" ON "resources"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_role_resource" ON "role_resources"("role_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_field_field_code_key" ON "m_field"("field_code");

-- CreateIndex
CREATE UNIQUE INDEX "m_policy_policy_code_key" ON "m_policy"("policy_code");

-- CreateIndex
CREATE UNIQUE INDEX "m_policy_department_id_policy_name_key" ON "m_policy"("department_id", "policy_name");

-- CreateIndex
CREATE UNIQUE INDEX "m_scheme_definitions_service_id_key" ON "m_scheme_definitions"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_scheme_definitions_scheme_code_version_key" ON "m_scheme_definitions"("scheme_code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "m_scheme_definitions_policy_id_scheme_name_version_key" ON "m_scheme_definitions"("policy_id", "scheme_name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "master_tables_master_code_key" ON "master_tables"("master_code");

-- CreateIndex
CREATE UNIQUE INDEX "m_workflow_jurisdiction_level_code_key" ON "m_workflow_jurisdiction_level"("code");

-- CreateIndex
CREATE UNIQUE INDEX "m_workflow_assignment_strategy_code_key" ON "m_workflow_assignment_strategy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "m_workflow_action_master_code_key" ON "m_workflow_action_master"("code");

-- CreateIndex
CREATE UNIQUE INDEX "m_service_service_id_key" ON "m_service"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorDocument_documentReferenceNumber_key" ON "InvestorDocument"("documentReferenceNumber");

-- CreateIndex
CREATE INDEX "InvestorDocument_documentMasterId_investorProfileUid_idx" ON "InvestorDocument"("documentMasterId", "investorProfileUid");

-- CreateIndex
CREATE INDEX "InvestorDocument_investorProfileUid_idx" ON "InvestorDocument"("investorProfileUid");

-- CreateIndex
CREATE INDEX "InvestorDocument_userId_idx" ON "InvestorDocument"("userId");

-- CreateIndex
CREATE INDEX "InvestorDocument_documentStatus_idx" ON "InvestorDocument"("documentStatus");

-- CreateIndex
CREATE INDEX "InvestorDocument_createdAt_idx" ON "InvestorDocument"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "m_unit_types_name_isActive_key" ON "m_unit_types"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_land_categories_name_isActive_key" ON "m_land_categories"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_sectors_name_isActive_key" ON "m_sectors"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_sub_sectors_name_isActive_key" ON "m_sub_sectors"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_msme_year_name_isActive_key" ON "m_msme_year"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_unit_categories_name_isActive_key" ON "m_unit_categories"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_anchor_types_name_isActive_key" ON "m_anchor_types"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_region_categories_name_isActive_key" ON "m_region_categories"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_mapping_region_categories_blockId_regionCategoryId_isActi_key" ON "m_mapping_region_categories"("blockId", "regionCategoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_beneficiary_types_name_isActive_key" ON "m_beneficiary_types"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_occurrences_name_isActive_key" ON "m_occurrences"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_incentive_types_name_isActive_key" ON "m_incentive_types"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "m_financial_parameter_code_name_isActive_key" ON "m_financial_parameter"("code", "name", "isActive");

-- CreateIndex
CREATE INDEX "bo_api_access_log_request_time_idx" ON "bo_api_access_log"("request_time");

-- CreateIndex
CREATE UNIQUE INDEX "m_act_policy_notification_departments_actpolicynotification_key" ON "m_act_policy_notification_departments"("actpolicynotification_id", "department_id");

-- CreateIndex
CREATE INDEX "kya_questions_m_kya_category_id_idx" ON "kya_questions"("m_kya_category_id");

-- CreateIndex
CREATE INDEX "kya_questions_parent_question_id_idx" ON "kya_questions"("parent_question_id");

-- CreateIndex
CREATE INDEX "kya_options_kya_question_id_idx" ON "kya_options"("kya_question_id");

-- CreateIndex
CREATE INDEX "kya_service_mappings_kya_option_id_idx" ON "kya_service_mappings"("kya_option_id");

-- CreateIndex
CREATE INDEX "kya_service_mappings_m_service_id_idx" ON "kya_service_mappings"("m_service_id");

-- CreateIndex
CREATE UNIQUE INDEX "kya_service_mappings_kya_option_id_m_service_id_key" ON "kya_service_mappings"("kya_option_id", "m_service_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_service_details_m_service_id_key" ON "m_service_details"("m_service_id");

-- CreateIndex
CREATE INDEX "m_service_details_m_service_id_idx" ON "m_service_details"("m_service_id");

-- CreateIndex
CREATE INDEX "m_service_details_service_category_idx" ON "m_service_details"("service_category");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_checklists_serviceId_version_key" ON "inspection_checklists"("serviceId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "third_party_inspectors_userId_key" ON "third_party_inspectors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "third_party_inspectors_recognitionId_key" ON "third_party_inspectors"("recognitionId");

-- CreateIndex
CREATE INDEX "inspection_transactions_status_idx" ON "inspection_transactions"("status");

-- CreateIndex
CREATE INDEX "inspection_transactions_scheduledDate_idx" ON "inspection_transactions"("scheduledDate");

-- CreateIndex
CREATE INDEX "inspection_transactions_riskCategory_idx" ON "inspection_transactions"("riskCategory");

-- CreateIndex
CREATE INDEX "inspection_transactions_application_submission_id_idx" ON "inspection_transactions"("application_submission_id");

-- CreateIndex
CREATE INDEX "inspection_transactions_district_id_idx" ON "inspection_transactions"("district_id");

-- CreateIndex
CREATE INDEX "inspection_transactions_financial_year_idx" ON "inspection_transactions"("financial_year");

-- CreateIndex
CREATE INDEX "inspection_transactions_completed_at_idx" ON "inspection_transactions"("completed_at");

-- CreateIndex
CREATE INDEX "inspection_evidence_inspectionId_idx" ON "inspection_evidence"("inspectionId");

-- CreateIndex
CREATE INDEX "inspection_checklist_responses_inspectionId_idx" ON "inspection_checklist_responses"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_checklist_responses_inspectionId_checklistItemId_key" ON "inspection_checklist_responses"("inspectionId", "checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_feedback_inspectionId_key" ON "inspection_feedback"("inspectionId");

-- CreateIndex
CREATE INDEX "inspection_audit_logs_inspectionId_idx" ON "inspection_audit_logs"("inspectionId");

-- CreateIndex
CREATE INDEX "inspection_audit_logs_performedAt_idx" ON "inspection_audit_logs"("performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "m_information_wizard_service_id_key" ON "m_information_wizard"("service_id");

-- CreateIndex
CREATE INDEX "m_information_wizard_service_id_idx" ON "m_information_wizard"("service_id");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_department_id_idx" ON "c_application_workflow_configuration"("department_id");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_service_id_idx" ON "c_application_workflow_configuration"("service_id");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_form_type_id_idx" ON "c_application_workflow_configuration"("form_type_id");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_jurisdiction_level_id_idx" ON "c_application_workflow_configuration"("jurisdiction_level_id");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_assignment_strategy_id_idx" ON "c_application_workflow_configuration"("assignment_strategy_id");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_service_id_config_vers_idx" ON "c_application_workflow_configuration"("service_id", "config_version", "status");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_service_id_step_status_idx" ON "c_application_workflow_configuration"("service_id", "step", "status");

-- CreateIndex
CREATE INDEX "c_application_workflow_configuration_role_id_jurisdiction_l_idx" ON "c_application_workflow_configuration"("role_id", "jurisdiction_level", "status");

-- CreateIndex
CREATE INDEX "t_application_submission_user_id_idx" ON "t_application_submission"("user_id");

-- CreateIndex
CREATE INDEX "t_application_submission_service_id_idx" ON "t_application_submission"("service_id");

-- CreateIndex
CREATE INDEX "t_application_submission_landrigion_id_idx" ON "t_application_submission"("landrigion_id");

-- CreateIndex
CREATE INDEX "t_application_submission_processing_level_idx" ON "t_application_submission"("processing_level");

-- CreateIndex
CREATE INDEX "t_workflow_instance_application_id_idx" ON "t_workflow_instance"("application_id");

-- CreateIndex
CREATE INDEX "t_workflow_audit_application_id_idx" ON "t_workflow_audit"("application_id");

-- CreateIndex
CREATE INDEX "t_forward_application_app_Sub_id_idx" ON "t_forward_application"("app_Sub_id");

-- CreateIndex
CREATE INDEX "t_forward_application_next_role_id_idx" ON "t_forward_application"("next_role_id");

-- CreateIndex
CREATE INDEX "t_forward_application_verifier_user_id_idx" ON "t_forward_application"("verifier_user_id");

-- CreateIndex
CREATE INDEX "t_forward_application_forwarded_dept_id_idx" ON "t_forward_application"("forwarded_dept_id");

-- CreateIndex
CREATE INDEX "t_application_history_sno_idx" ON "t_application_history"("sno");

-- CreateIndex
CREATE INDEX "t_application_history_added_date_time_idx" ON "t_application_history"("added_date_time");

-- CreateIndex
CREATE INDEX "t_application_history_application_status_idx" ON "t_application_history"("application_status");

-- CreateIndex
CREATE INDEX "t_application_history_app_id_idx" ON "t_application_history"("app_id");

-- CreateIndex
CREATE INDEX "t_sp_applications_caf_id_idx" ON "t_sp_applications"("caf_id");

-- CreateIndex
CREATE INDEX "t_sp_applications_sp_app_id_idx" ON "t_sp_applications"("sp_app_id");

-- CreateIndex
CREATE INDEX "t_sp_applications_user_id_idx" ON "t_sp_applications"("user_id");

-- CreateIndex
CREATE INDEX "t_sp_applications_app_status_idx" ON "t_sp_applications"("app_status");

-- CreateIndex
CREATE INDEX "t_sp_applications_is_active_idx" ON "t_sp_applications"("is_active");

-- CreateIndex
CREATE INDEX "t_application_dms_documents_mapping_iuid_idx" ON "t_application_dms_documents_mapping"("iuid");

-- CreateIndex
CREATE INDEX "t_application_dms_documents_mapping_user_id_idx" ON "t_application_dms_documents_mapping"("user_id");

-- CreateIndex
CREATE INDEX "t_application_dms_documents_mapping_sno_idx" ON "t_application_dms_documents_mapping"("sno");

-- CreateIndex
CREATE INDEX "t_application_dms_documents_mapping_service_id_idx" ON "t_application_dms_documents_mapping"("service_id");

-- CreateIndex
CREATE INDEX "t_application_dms_documents_mapping_sno_service_id_idx" ON "t_application_dms_documents_mapping"("sno", "service_id");

-- CreateIndex
CREATE INDEX "t_application_dms_documents_mapping_documents_id_idx" ON "t_application_dms_documents_mapping"("documents_id");

-- CreateIndex
CREATE INDEX "bo_application_dms_documents_mapping_logs_mapping_id_idx" ON "bo_application_dms_documents_mapping_logs"("mapping_id");

-- CreateIndex
CREATE INDEX "bo_application_dms_documents_mapping_logs_documents_id_idx" ON "bo_application_dms_documents_mapping_logs"("documents_id");

-- CreateIndex
CREATE INDEX "idx_payment_detail_application_id" ON "t_payment_detail"("application_id");

-- CreateIndex
CREATE INDEX "idx_payment_detail_app_sub_id" ON "t_payment_detail"("app_sub_id");

-- CreateIndex
CREATE INDEX "t_project_status_update_caf_id_idx" ON "t_project_status_update"("caf_id");

-- CreateIndex
CREATE INDEX "t_project_status_update_user_id_idx" ON "t_project_status_update"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_logs" ADD CONSTRAINT "user_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_logs" ADD CONSTRAINT "user_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "user_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_states" ADD CONSTRAINT "m_states_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "m_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_districts" ADD CONSTRAINT "m_districts_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "m_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_blocks" ADD CONSTRAINT "m_blocks_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "m_districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_blocks" ADD CONSTRAINT "m_blocks_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "m_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_tehsils" ADD CONSTRAINT "m_tehsils_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "m_districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_tehsils" ADD CONSTRAINT "m_tehsils_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "m_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_villages" ADD CONSTRAINT "m_villages_tehsilId_fkey" FOREIGN KEY ("tehsilId") REFERENCES "m_tehsils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_departments" ADD CONSTRAINT "m_departments_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "m_issuers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_form_field" ADD CONSTRAINT "m_fb_form_field_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "m_fb_form_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_form_mapping" ADD CONSTRAINT "m_fb_form_mapping_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "m_service"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_form_builder_fields" ADD CONSTRAINT "m_fb_form_builder_fields_form_field_id_fkey" FOREIGN KEY ("form_field_id") REFERENCES "m_fb_form_field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_formfield_options" ADD CONSTRAINT "m_fb_formfield_options_builder_field_id_fkey" FOREIGN KEY ("builder_field_id") REFERENCES "m_fb_form_builder_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_formfield_options" ADD CONSTRAINT "m_fb_formfield_options_master_table_id_fkey" FOREIGN KEY ("master_table_id") REFERENCES "master_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_formfield_options" ADD CONSTRAINT "m_fb_formfield_options_parent_builder_field_id_fkey" FOREIGN KEY ("parent_builder_field_id") REFERENCES "m_fb_form_builder_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_addmore_groups" ADD CONSTRAINT "m_fb_addmore_groups_trigger_builder_field_id_fkey" FOREIGN KEY ("trigger_builder_field_id") REFERENCES "m_fb_form_builder_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_addmore_columns" ADD CONSTRAINT "m_fb_addmore_columns_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "m_fb_addmore_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_fb_addmore_columns" ADD CONSTRAINT "m_fb_addmore_columns_builder_field_id_fkey" FOREIGN KEY ("builder_field_id") REFERENCES "m_fb_form_builder_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_document_master" ADD CONSTRAINT "m_document_master_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "m_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_document_master" ADD CONSTRAINT "m_document_master_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "m_issuers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_document_master" ADD CONSTRAINT "m_document_master_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "m_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_document_master" ADD CONSTRAINT "m_document_master_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "m_documenttypes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_profiles" ADD CONSTRAINT "investor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_users" ADD CONSTRAINT "department_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_resources" ADD CONSTRAINT "role_resources_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_resources" ADD CONSTRAINT "role_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_policy" ADD CONSTRAINT "m_policy_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "m_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_scheme_definitions" ADD CONSTRAINT "m_scheme_definitions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "m_policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_scheme_definitions" ADD CONSTRAINT "m_scheme_definitions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "m_service"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_tables" ADD CONSTRAINT "master_tables_parent_master_id_fkey" FOREIGN KEY ("parent_master_id") REFERENCES "master_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_service" ADD CONSTRAINT "m_service_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "m_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_service" ADD CONSTRAINT "m_service_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "m_issuers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDocument" ADD CONSTRAINT "InvestorDocument_documentMasterId_fkey" FOREIGN KEY ("documentMasterId") REFERENCES "m_document_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDocument" ADD CONSTRAINT "InvestorDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "m_documenttypes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDocument" ADD CONSTRAINT "InvestorDocument_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "m_issuers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDocument" ADD CONSTRAINT "InvestorDocument_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "m_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDocument" ADD CONSTRAINT "InvestorDocument_investorProfileUid_fkey" FOREIGN KEY ("investorProfileUid") REFERENCES "investor_profiles"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorDocument" ADD CONSTRAINT "InvestorDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_sub_sectors" ADD CONSTRAINT "m_sub_sectors_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "m_sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_unit_categories" ADD CONSTRAINT "m_unit_categories_msmeYearId_fkey" FOREIGN KEY ("msmeYearId") REFERENCES "m_msme_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_mapping_region_categories" ADD CONSTRAINT "m_mapping_region_categories_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "m_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_mapping_region_categories" ADD CONSTRAINT "m_mapping_region_categories_regionCategoryId_fkey" FOREIGN KEY ("regionCategoryId") REFERENCES "m_region_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "m_policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_msme_year_value_fkey" FOREIGN KEY ("msme_year_value") REFERENCES "m_msme_year"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_unit_category_value_fkey" FOREIGN KEY ("unit_category_value") REFERENCES "m_unit_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_unit_type_value_fkey" FOREIGN KEY ("unit_type_value") REFERENCES "m_unit_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_sector_value_fkey" FOREIGN KEY ("sector_value") REFERENCES "m_sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_sub_sector_value_fkey" FOREIGN KEY ("sub_sector_value") REFERENCES "m_sub_sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_ocurrance_value_fkey" FOREIGN KEY ("ocurrance_value") REFERENCES "m_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_block_value_fkey" FOREIGN KEY ("block_value") REFERENCES "m_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_region_category_value_fkey" FOREIGN KEY ("region_category_value") REFERENCES "m_region_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_land_type_value_fkey" FOREIGN KEY ("land_type_value") REFERENCES "m_land_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_beneficiary_type_value_fkey" FOREIGN KEY ("beneficiary_type_value") REFERENCES "m_beneficiary_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_anchor_unit_value_fkey" FOREIGN KEY ("anchor_unit_value") REFERENCES "m_anchor_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_incentive_mapping_id_fkey" FOREIGN KEY ("incentive_mapping_id") REFERENCES "m_financial_parameter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_incentive_value_fkey" FOREIGN KEY ("incentive_value") REFERENCES "m_incentive_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "m_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_kyi_ic_calculator" ADD CONSTRAINT "m_kyi_ic_calculator_mappingRegionCategoriesId_fkey" FOREIGN KEY ("mappingRegionCategoriesId") REFERENCES "m_mapping_region_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_act_policy_notification_departments" ADD CONSTRAINT "m_act_policy_notification_departments_actpolicynotificatio_fkey" FOREIGN KEY ("actpolicynotification_id") REFERENCES "m_act_policy_notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_act_policy_notification_departments" ADD CONSTRAINT "m_act_policy_notification_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "m_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_act_policy_notification_amendments" ADD CONSTRAINT "m_act_policy_notification_amendments_actpolicynotification_fkey" FOREIGN KEY ("actpolicynotification_id") REFERENCES "m_act_policy_notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_questions" ADD CONSTRAINT "kya_questions_m_kya_category_id_fkey" FOREIGN KEY ("m_kya_category_id") REFERENCES "m_kya_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_questions" ADD CONSTRAINT "kya_questions_parent_question_id_fkey" FOREIGN KEY ("parent_question_id") REFERENCES "kya_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_questions" ADD CONSTRAINT "kya_questions_kya_option_id_fkey" FOREIGN KEY ("kya_option_id") REFERENCES "kya_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_options" ADD CONSTRAINT "kya_options_kya_question_id_fkey" FOREIGN KEY ("kya_question_id") REFERENCES "kya_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_service_mappings" ADD CONSTRAINT "kya_service_mappings_kya_option_id_fkey" FOREIGN KEY ("kya_option_id") REFERENCES "kya_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kya_service_mappings" ADD CONSTRAINT "kya_service_mappings_m_service_id_fkey" FOREIGN KEY ("m_service_id") REFERENCES "m_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_service_details" ADD CONSTRAINT "m_service_details_m_service_id_fkey" FOREIGN KEY ("m_service_id") REFERENCES "m_service"("service_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklists" ADD CONSTRAINT "inspection_checklists_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "m_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_items" ADD CONSTRAINT "inspection_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "inspection_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "third_party_inspectors" ADD CONSTRAINT "third_party_inspectors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_transactions" ADD CONSTRAINT "inspection_transactions_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "m_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_transactions" ADD CONSTRAINT "inspection_transactions_application_submission_id_fkey" FOREIGN KEY ("application_submission_id") REFERENCES "t_application_submission"("submission_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_transactions" ADD CONSTRAINT "inspection_transactions_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "inspection_checklists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_transactions" ADD CONSTRAINT "inspection_transactions_thirdPartyInspectorId_fkey" FOREIGN KEY ("thirdPartyInspectorId") REFERENCES "third_party_inspectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_observations" ADD CONSTRAINT "inspection_observations_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspection_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_observation_responses" ADD CONSTRAINT "inspection_observation_responses_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "inspection_observations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_evidence" ADD CONSTRAINT "inspection_evidence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspection_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklist_responses" ADD CONSTRAINT "inspection_checklist_responses_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspection_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_feedback" ADD CONSTRAINT "inspection_feedback_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspection_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_audit_logs" ADD CONSTRAINT "inspection_audit_logs_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspection_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m_information_wizard" ADD CONSTRAINT "m_information_wizard_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "m_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c_application_workflow_configuration" ADD CONSTRAINT "c_application_workflow_configuration_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "m_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c_application_workflow_configuration" ADD CONSTRAINT "c_application_workflow_configuration_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "m_service"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c_application_workflow_configuration" ADD CONSTRAINT "c_application_workflow_configuration_form_type_id_fkey" FOREIGN KEY ("form_type_id") REFERENCES "m_fb_form_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c_application_workflow_configuration" ADD CONSTRAINT "c_application_workflow_configuration_jurisdiction_level_id_fkey" FOREIGN KEY ("jurisdiction_level_id") REFERENCES "m_workflow_jurisdiction_level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "c_application_workflow_configuration" ADD CONSTRAINT "c_application_workflow_configuration_assignment_strategy_i_fkey" FOREIGN KEY ("assignment_strategy_id") REFERENCES "m_workflow_assignment_strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
