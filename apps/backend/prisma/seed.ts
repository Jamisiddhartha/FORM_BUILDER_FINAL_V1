import { PrismaClient } from '@prisma/client';
import { seedRoles } from './seeds/roles.seed';
import { seedResources } from './seeds/resources.seed';
import { seedRoleResources } from './seeds/role-resources.seed';
import { seedCountries } from './seeds/country.seed';
import { seedStates } from './seeds/state.seed';
import { seedDistricts } from './seeds/district.seed';
import { seedBlocks } from './seeds/block.seed';
import { seedTehsils } from './seeds/tehsil.seed';
import { seedVillages } from './seeds/village.seed';
import { seedDepartments } from './seeds/department.seed';
import { seedIssuers } from './seeds/issuer.seed';
import { seedDocumentTypes } from './seeds/document-type.seed';
import { seedFormCategories } from './seeds/form-category.seed';
import { seedFormTypes } from './seeds/form-type.seed';
import { seedFormFields } from './seeds/form-field.seed';
import { seedFbFormMapping } from './seeds/m_fb_form_mapping.seed';
import { seedFbPageMaster } from './seeds/m_fb_page_master.seed';
import { seedFbPageCategoryMapping } from './seeds/m_fb_page_category_mapping.seed';
import { seedServicetypes } from './seeds/servicetype.seed';
import { seedServicesectors } from './seeds/servicesector.seed';
import { seedServiceincidences } from './seeds/serviceincidence.seed';
import { seedDocumentCheckpoints } from './seeds/document-checkpoint.seed';
import { seedDocumentMaster } from './seeds/document-master.seed';
import { seedUsers } from './seeds/user.seed';
import { seedLegacyDepartmentUsers } from './seeds/legacy-department-users.seed';
import { seedMasterTables } from './seeds/master-tables.seed';
import { seedMsmeYear } from './seeds/msme-year.seed';
import { seedSector } from './seeds/sectors.seed';
import { seedLandCategory } from './seeds/land-categories.seed';
import { seedSubSector } from './seeds/sub-sectors.seed';
import { seedUnitCategories } from './seeds/unit-categories.seed';
import { seedAnchorTypes } from './seeds/anchor-types.seed';
import { seedRegionCategories } from './seeds/region-categories.seed';
import { seedMappingRegionCategories } from './seeds/mapping-region-categories.seed';
import { seedBeneficiaryTypes } from './seeds/beneficiary-types.seed';
import { seedOccurrences } from './seeds/occurrences.seed';
import { seedIncentiveTypes } from './seeds/incentive-types.seed';
import { seedFinancialParameter } from './seeds/financial-parameter.seed';
import { seedUnitTypes } from './seeds/unit-types.seed';
import { seedPolicies } from './seeds/policy.seed';
import { seedActPolicyNotifications } from './seeds/act-policy-notification.seed';
import { seedActPolicyNotificationDepartments } from './seeds/act-policy-notification-department.seed';
import { seedActPolicyNotificationAmendments } from './seeds/act-policy-notification-amendment.seed';
import { seedFields } from './seeds/field.seed';
import { seedNicCodes } from './seeds/nic-code.seed';
import { seedHsnCodes } from './seeds/hsn-code.seed';
import { seedWorkflowConfig } from './seeds/workflow-config.seed';
import { seedWorkflowJurisdictionLevels } from './seeds/workflow-jurisdiction-level.seed';
import { seedWorkflowAssignmentStrategies } from './seeds/workflow-assignment-strategy.seed';
import { seedWorkflowActions } from './seeds/workflow-action-master.seed';
import { seedInprincipleLiveSnapshot } from './seeds/inprinciple-live-snapshot.seed';

import { seedServiceDetails } from './seeds/service-details.seed';
import { seedKyaData } from './seeds/kya-data.seed';
import { seedInspections } from './seeds/inspections.seed';
import { seedCISInspections } from './seeds/cis-inspections.seed';
import { seedUpclSupplyCategories } from './seeds/upcl-supply-categories.seed';
import { seedUpclSupplySubcategories } from './seeds/upcl-supply-subcategories.seed';
import { seedUpclDivisionSubdivisions } from './seeds/upcl-division-subdivisions.seed';
import { seedUpclVoltage } from './seeds/upcl-voltage.seed';
import { seedUjsDivision } from './seeds/ujs-division.seed';
import { seedLabourFactoryTypeMaster } from './seeds/labour-factory-type-master.seed';
import { seedLabourFactorySec85 } from './seeds/labour-factory-sec85.seed';
import { seedPollutionControlEquipments } from './seeds/pollution-control-equipments.seed';
import { seedCurrentLanduse } from './seeds/current-landuse.seed';
import { seedProjectStatus } from './seeds/project-status.seed';
import { seedLandAllotmentStage } from './seeds/land-allotment-stage.seed';
import { seedServices } from './seeds/service.seed';
import { seedOrganisationNature } from './seeds/organization-nature.seed';
import { seedPollutionCategories } from './seeds/pollution-categories.seed';
import { seedSchemeDefinitions } from './seeds/scheme-definitions.seed';
import { seedKycIcCalculator } from './seeds/kyi-ic-calculator.seed';

import { seedServiceBackfill } from './seeds/service-backfill.seed';

// NEW: demo sso seed
import { seedDemoSso } from './seeds/demo-sso.seed';

// KYA (Know Your Approval) seed
import { seedKya } from './seeds/kya.seed';

import { seedUttarakhandInspectors } from './seeds/uttarakhand-inspectors.seed';

const prisma = new PrismaClient();

// --- Truncate all tables in the correct order to avoid FK conflicts ---
async function truncateAllTables(prisma: PrismaClient) {
  console.log('\n🗑️  Truncating all tables...');

  const tablesToTruncate = [
    // Inspection module (has FK to services)
    'inspection_observation_responses',
    'inspection_observations',
    'inspection_transactions',
    'inspection_checklist_items',
    'inspection_checklists',
    'third_party_inspectors',
    // RBAC
    'role_resources',
    'user_logs',
    'user_tokens',
    'department_users',
    'investor_profiles',
    'users',
    'm_villages',
    'm_tehsils',
    'm_blocks',
    'm_districts',
    'm_states',
    'm_countries',
    'm_document_checkpoints',
    'm_documenttypes',
    'm_issuers',
    'm_departments',
    'm_document_master',
    'm_fb_form_types',
    'm_fb_form_categories',
    'm_fb_form_field',
    'm_fb_form_mapping',
    'm_fb_page_master',
    'm_fb_page_category_mapping',
    'm_nic_code',
    'm_hsn_code',
    'master_tables',
    'm_servicetype',
    'm_servicesector',
    'm_serviceincidence', // ← ensure this matches actual table
    'kya_service_mappings',
    'kya_options',
    'kya_questions',
    'm_kya_categories',
    'm_service_details',
    'm_service',
    'm_workflow_action_master',
    'm_workflow_assignment_strategy',
    'm_workflow_jurisdiction_level',
    'm_pollution_categories',
    'm_project_status',
    'm_land_allotment_stage',
    'm_information_wizard',
    'm_policy',
    'resources',
    'roles',
    'm_act_policy_notification',
    'm_act_policy_notification_departments',
    'm_act_policy_notification_amendments',
    'c_application_workflow_configuration',
    // NOTE: Skip all t_* transactional tables
  ];

  for (const tableName of tablesToTruncate) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
      console.log(`  ✓ Truncated ${tableName}`);
    } catch (error) {
      console.warn(`  ⚠️  Could not truncate ${tableName}: ${(error as Error).message}`);
    }
  }

  console.log('✅ All tables truncated successfully.');
}

// --- Reset sequences for all tables ---
async function resetAllSequences(prisma: PrismaClient) {
  console.log('\n🔄 Resetting all auto-increment sequences...');

  const tables = [
    { tableName: 'users', seqName: 'users_id_seq' },
    { tableName: 'roles', seqName: 'roles_id_seq' },
    { tableName: 'resources', seqName: 'resources_id_seq' },
    { tableName: 'role_resources', seqName: 'role_resources_id_seq' },
    { tableName: 'user_logs', seqName: 'user_logs_id_seq' },
    { tableName: 'user_tokens', seqName: 'user_tokens_id_seq' },
    { tableName: 'investor_profiles', seqName: 'investor_profiles_id_seq' },
    { tableName: 'department_users', seqName: 'department_users_id_seq' },
    { tableName: 'm_countries', seqName: 'm_countries_id_seq' },
    { tableName: 'm_states', seqName: 'm_states_id_seq' },
    { tableName: 'm_districts', seqName: 'm_districts_id_seq' },
    { tableName: 'm_blocks', seqName: 'm_blocks_id_seq' },
    { tableName: 'm_tehsils', seqName: 'm_tehsils_id_seq' },
    { tableName: 'm_villages', seqName: 'm_villages_id_seq' },
    { tableName: 'm_departments', seqName: 'm_departments_id_seq' },
    { tableName: 'm_issuers', seqName: 'm_issuers_id_seq' },
    { tableName: 'm_documenttypes', seqName: 'm_documenttypes_id_seq' },
    { tableName: 'm_document_checkpoints', seqName: 'm_document_checkpoints_id_seq' },
    { tableName: 'm_document_master', seqName: 'm_document_master_id_seq' },
    { tableName: 'm_fb_form_types', seqName: 'm_fb_form_types_id_seq' },
    { tableName: 'm_fb_form_categories', seqName: 'm_fb_form_categories_id_seq' },
    { tableName: 'm_fb_form_field', seqName: 'm_fb_form_field_id_seq' },
    { tableName: 'm_fb_form_mapping', seqName: 'm_fb_form_mapping_id_seq' },
    { tableName: 'm_fb_page_master', seqName: 'm_fb_page_master_id_seq' },
    { tableName: 'm_fb_page_category_mapping', seqName: 'm_fb_page_category_mapping_id_seq' },
    { tableName: 'm_servicetype', seqName: 'm_servicetype_id_seq' },
    { tableName: 'm_servicesector', seqName: 'm_servicesector_id_seq' },
    { tableName: 'm_serviceincidence', seqName: 'm_serviceincidence_id_seq' }, // ← fixed
    { tableName: 'm_service', seqName: 'm_service_id_seq' },
    { tableName: 'm_kya_categories', seqName: 'm_kya_categories_id_seq' },
    { tableName: 'kya_questions', seqName: 'kya_questions_id_seq' },
    { tableName: 'kya_options', seqName: 'kya_options_id_seq' },
    { tableName: 'kya_service_mappings', seqName: 'kya_service_mappings_id_seq' },
    { tableName: 'm_service_details', seqName: 'm_service_details_id_seq' },
    { tableName: 'm_workflow_action_master', seqName: 'm_workflow_action_master_id_seq' },
    { tableName: 'm_workflow_assignment_strategy', seqName: 'm_workflow_assignment_strategy_id_seq' },
    { tableName: 'm_workflow_jurisdiction_level', seqName: 'm_workflow_jurisdiction_level_id_seq' },
    { tableName: 'm_pollution_categories', seqName: 'm_pollution_categories_id_seq' },
    { tableName: 'm_project_status', seqName: 'm_project_status_id_seq' },
    { tableName: 'm_land_allotment_stage', seqName: 'm_land_allotment_stage_id_seq' },
    { tableName: 'm_policy', seqName: 'm_policy_id_seq' },
    { tableName: 'm_nic_code', seqName: 'm_nic_code_id_seq' },
    { tableName: 'm_hsn_code', seqName: 'm_hsn_code_id_seq' },
    { tableName: 'm_information_wizard', seqName: 'm_information_wizard_id_seq' },
    { tableName: 'm_act_policy_notification', seqName: 'm_act_policy_notification_id_seq' },
    { tableName: 'm_act_policy_notification_departments', seqName: 'm_act_policy_notification_departments_id_seq' },
    { tableName: 'm_act_policy_notification_amendments', seqName: 'm_act_policy_notification_amendments_id_seq' },
    { tableName: 'c_application_workflow_configuration', seqName: 'c_application_workflow_configuration_id_seq' },
    // NOTE: Skip all t_* transactional tables
  ];

  for (const { tableName, seqName } of tables) {
    try {
      const query = `SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM "${tableName}"), 0) + 1, false);`;
      await prisma.$executeRawUnsafe(query);
      console.log(`  ✓ Sequence for ${tableName} reset.`);
    } catch (error) {
      console.warn(`  ⚠️  Could not reset sequence for ${tableName}: ${(error as Error).message}`);
    }
  }

  // Ensure CAF/submission IDs start after 10000
  try {
    await prisma.$executeRawUnsafe(`SELECT setval('t_application_submission_submission_id_seq', 10000, false);`);
    console.log('  ✓ Set t_application_submission sequence to start at 10000');
  } catch (error) {
    console.warn(`  ⚠️  Could not set submission sequence to 10000: ${(error as Error).message}`);
  }

  console.log('✅ All sequences have been reset correctly.');
}

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    console.log('🌱 Starting database seeding...\n');

    // --- Step 1: Truncate all tables ---
    await truncateAllTables(prisma);

    // --- Step 2: Reset sequences to 1 before seeding ---
    console.log('\n🔄 Resetting sequences to prepare for fresh seeding...');
    const resetTables = [
      { tableName: 'roles', seqName: 'roles_id_seq' },
      { tableName: 'resources', seqName: 'resources_id_seq' },
      { tableName: 'role_resources', seqName: 'role_resources_id_seq' },
      { tableName: 'm_countries', seqName: 'm_countries_id_seq' },
      { tableName: 'm_states', seqName: 'm_states_id_seq' },
      { tableName: 'm_districts', seqName: 'm_districts_id_seq' },
      { tableName: 'm_blocks', seqName: 'm_blocks_id_seq' },
      { tableName: 'm_tehsils', seqName: 'm_tehsils_id_seq' },
      { tableName: 'm_villages', seqName: 'm_villages_id_seq' },
      { tableName: 'm_issuers', seqName: 'm_issuers_id_seq' },
      { tableName: 'm_departments', seqName: 'm_departments_id_seq' },
      { tableName: 'm_documenttypes', seqName: 'm_documenttypes_id_seq' },
      { tableName: 'm_document_checkpoints', seqName: 'm_document_checkpoints_id_seq' },
      { tableName: 'm_document_master', seqName: 'm_document_master_id_seq' },
      { tableName: 'm_fb_form_types', seqName: 'm_fb_form_types_id_seq' },
      { tableName: 'm_fb_form_categories', seqName: 'm_fb_form_categories_id_seq' },
      { tableName: 'm_fb_form_field', seqName: 'm_fb_form_field_id_seq' },
      { tableName: 'm_fb_form_mapping', seqName: 'm_fb_form_mapping_id_seq' },
      { tableName: 'm_fb_page_master', seqName: 'm_fb_page_master_id_seq' },
      { tableName: 'm_fb_page_category_mapping', seqName: 'm_fb_page_category_mapping_id_seq' },
      { tableName: 'm_servicetype', seqName: 'm_servicetype_id_seq' },
      { tableName: 'm_servicesector', seqName: 'm_servicesector_id_seq' },
      { tableName: 'm_serviceincidence', seqName: 'm_serviceincidence_id_seq' }, // ← fixed
      { tableName: 'm_service', seqName: 'm_service_id_seq' },
      { tableName: 'm_workflow_action_master', seqName: 'm_workflow_action_master_id_seq' },
      { tableName: 'm_workflow_assignment_strategy', seqName: 'm_workflow_assignment_strategy_id_seq' },
      { tableName: 'm_workflow_jurisdiction_level', seqName: 'm_workflow_jurisdiction_level_id_seq' },
      { tableName: 'm_pollution_categories', seqName: 'm_pollution_categories_id_seq' },
      { tableName: 'm_project_status', seqName: 'm_project_status_id_seq' },
      { tableName: 'm_land_allotment_stage', seqName: 'm_land_allotment_stage_id_seq' },
      { tableName: 'm_policy', seqName: 'm_policy_id_seq' },
      { tableName: 'm_nic_code', seqName: 'm_nic_code_id_seq' },
      { tableName: 'm_hsn_code', seqName: 'm_hsn_code_id_seq' },
      { tableName: 'm_information_wizard', seqName: 'm_information_wizard_id_seq' },
      { tableName: 'users', seqName: 'users_id_seq' },
      { tableName: 'm_act_policy_notification', seqName: 'm_act_policy_notification_id_seq' },
      { tableName: 'm_act_policy_notification_departments', seqName: 'm_act_policy_notification_departments_id_seq' },
      { tableName: 'm_act_policy_notification_amendments', seqName: 'm_act_policy_notification_amendments_id_seq' },
      { tableName: 'c_application_workflow_configuration', seqName: 'c_application_workflow_configuration_id_seq' },
      // NOTE: Skip all t_* transactional tables
    ];

    for (const { tableName, seqName } of resetTables) {
      try {
        await prisma.$executeRawUnsafe(`SELECT setval('${seqName}', 1, false);`);
        console.log(`  ✓ Reset ${tableName} sequence to 1`);
      } catch (error) {
        console.warn(`  ⚠️  Could not reset ${tableName} sequence: ${(error as Error).message}`);
      }
    }

    // --- Step 3: Seed data in proper order ---
    console.log('\n📌 Starting fresh seeding process...\n');

    // RBAC
    await seedRoles(prisma);
    await seedResources(prisma);
    await seedRoleResources(prisma);

    // Geographic masters
    await seedCountries(prisma);
    await seedStates(prisma);
    await seedDistricts(prisma);
    await seedBlocks(prisma);
    await seedTehsils(prisma);
    await seedVillages(prisma);

    // Other masters (dependencies first!)
    await seedIssuers(prisma);
    await seedDocumentTypes(prisma);
    await seedDocumentCheckpoints(prisma);
    await seedDepartments(prisma);
    await seedLegacyDepartmentUsers(prisma);



    // Document master depends on departments & document types
    await seedDocumentMaster(prisma);

    // NIC / HSN master data
    await seedNicCodes(prisma);
    await seedHsnCodes(prisma);
    await seedMasterTables(prisma);

    // Users & form/services
    await seedUsers(prisma);
    await seedFormTypes(prisma);
    try {
      await seedFormCategories(prisma);
    } catch (error) {
      console.warn('  ⚠️  Form categories seed failed (likely encoding issue):', (error as Error).message);
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedFormFields(prisma);
    } catch (error) {
      console.warn('  ⚠️  Form fields seed failed (likely encoding issue):', (error as Error).message);
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    await seedServicetypes(prisma);
    await seedServicesectors(prisma);
    await seedServiceincidences(prisma);
    await seedServices(prisma);
    await seedWorkflowJurisdictionLevels(prisma);
    await seedWorkflowAssignmentStrategies(prisma);
    await seedWorkflowActions(prisma);
    await seedServiceBackfill(prisma);
    try {
      await seedFbFormMapping(prisma);
    } catch (error) {
      console.warn('  ⚠️  Form mapping seed failed (likely encoding issue):', (error as Error).message);
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedFbPageMaster(prisma);
    } catch (error) {
      console.warn('  ⚠️  Page master seed failed (likely encoding issue):', (error as Error).message);
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedFbPageCategoryMapping(prisma);
    } catch (error) {
      console.warn('  ⚠️  Page category mapping seed failed (likely encoding issue):', (error as Error).message);
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    await seedWorkflowConfig(prisma);
    await seedInprincipleLiveSnapshot(prisma);
    await seedActPolicyNotifications(prisma);
    await seedActPolicyNotificationDepartments(prisma);
    await seedActPolicyNotificationAmendments(prisma);

    // KYI and IC masters
    await seedMsmeYear(prisma);
    await seedSector(prisma);
    await seedLandCategory(prisma);
    await seedSubSector(prisma);
    try {
      await seedUnitCategories(prisma);
    } catch (error) {
      console.warn('  ⚠️  Unit categories seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedAnchorTypes(prisma);
    } catch (error) {
      console.warn('  ⚠️  Anchor types seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedRegionCategories(prisma);
    } catch (error) {
      console.warn('  ⚠️  Region categories seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedMappingRegionCategories(prisma);
    } catch (error) {
      console.warn('  ⚠️  Mapping region categories seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedBeneficiaryTypes(prisma);
    } catch (error) {
      console.warn('  ⚠️  Beneficiary types seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedOccurrences(prisma);
    } catch (error) {
      console.warn('  ⚠️  Occurrences seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedIncentiveTypes(prisma);
    } catch (error) {
      console.warn('  ⚠️  Incentive types seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedFinancialParameter(prisma);
    } catch (error) {
      console.warn('  ⚠️  Financial parameter seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedUnitTypes(prisma);
    } catch (error) {
      console.warn('  ⚠️  Unit types seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedServiceDetails(prisma);
    } catch (error) {
      console.warn('  ⚠️  Service details seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }

    // Policies depend on departments
    try {
      await seedPolicies(prisma);
    } catch (error) {
      console.warn('  ⚠️  Policies seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedFields(prisma);
    } catch (error) {
      console.warn('  ⚠️  Fields seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedSchemeDefinitions(prisma);
    } catch (error) {
      console.warn('  ⚠️  Scheme definitions seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedKycIcCalculator(prisma);
    } catch (error) {
      console.warn('  ⚠️  Kyc IC calculator seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }

    // KYA module
    try {
      await seedKya(prisma);
    } catch (error) {
      console.warn('  ⚠️  KYA seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }

    // Inspections module
    try {
      await seedInspections(prisma);
    } catch (error) {
      console.warn('  ⚠️  Inspections seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedCISInspections(prisma);
    } catch (error) {
      console.warn('  ⚠️  CIS Inspections seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    
    // Seed Uttarakhand Inspectors
    try {
      await seedUttarakhandInspectors(prisma);
    } catch (error) {
      console.warn('  ⚠️  Uttarakhand inspectors seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }

    // --- Step 4: Ensure demo SSO rows exist (safe upserts) ---
    try {
      await seedDemoSso(prisma);
    } catch (error) {
      console.warn('  ⚠️  Demo SSO seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }

    try {
      await seedUpclSupplyCategories(prisma);
    } catch (error) {
      console.warn('  ⚠️  UPCL supply categories seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedUpclSupplySubcategories(prisma);
    } catch (error) {
      console.warn('  ⚠️  UPCL supply subcategories seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedUpclDivisionSubdivisions(prisma);
    } catch (error) {
      console.warn('  ⚠️  UPCL division subdivisions seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedUpclVoltage(prisma);
    } catch (error) {
      console.warn('  ⚠️  UPCL voltage seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedUjsDivision(prisma);
    } catch (error) {
      console.warn('  ⚠️  UJS Division seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedLabourFactoryTypeMaster(prisma);
    } catch (error) {
      console.warn('  ⚠️  Labour factory type master seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedLabourFactorySec85(prisma);
    } catch (error) {
      console.warn('  ⚠️  Labour factory Sec85 seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedPollutionControlEquipments(prisma);
    } catch (error) {
      console.warn('  ⚠️  Pollution control equipments seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedPollutionCategories(prisma);
    } catch (error) {
      console.warn('  ⚠️  Pollution categories seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedCurrentLanduse(prisma);
    } catch (error) {
      console.warn('  ⚠️  Current landuse seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedProjectStatus(prisma);
    } catch (error) {
      console.warn('  ⚠️  Project status seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedLandAllotmentStage(prisma);
    } catch (error) {
      console.warn('  ⚠️  Land allotment stage seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
    try {
      await seedOrganisationNature(prisma);
    } catch (error) {
      console.warn('  ⚠️  Organisation nature seed failed (likely encoding issue)');
      console.log('  ℹ️  Continuing with remaining seeds...');
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
