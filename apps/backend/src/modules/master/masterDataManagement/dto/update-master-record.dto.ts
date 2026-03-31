import { CreateMasterDataRecordDto } from './create-master-record.dto';

export class UpdateMasterDataRecordDto implements Partial<CreateMasterDataRecordDto> {
  code?: string;
  name?: string;
  description?: string;
  parentId?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  departmentId?: number | null;
  subDepartmentId?: number | null;
  sortOrder?: number;
  metadata?: Record<string, any>;
  isActive?: boolean;
}
