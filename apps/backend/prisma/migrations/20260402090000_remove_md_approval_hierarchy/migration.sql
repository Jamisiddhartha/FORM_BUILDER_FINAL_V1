-- Drop foreign keys first
ALTER TABLE IF EXISTS mdm_industrial_approvals."md_approval_hierarchy" DROP CONSTRAINT IF EXISTS "md_approval_hierarchy_parent_id_fkey";
ALTER TABLE IF EXISTS mdm_industrial_approvals."md_approval_hierarchy" DROP CONSTRAINT IF EXISTS "md_approval_hierarchy_approval_id_fkey";

-- Drop the table
DROP TABLE IF EXISTS mdm_industrial_approvals."md_approval_hierarchy";
