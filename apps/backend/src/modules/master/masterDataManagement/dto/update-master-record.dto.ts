import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { CreateMasterDataRecordDto } from './create-master-record.dto';

export class UpdateMasterDataRecordDto
  implements Partial<CreateMasterDataRecordDto>
{
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  parentId?: number | null;

  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  @IsOptional()
  validFrom?: string | null;

  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  @IsOptional()
  validTo?: string | null;

  @IsInt()
  @IsOptional()
  departmentId?: number | null;

  @IsInt()
  @IsOptional()
  subDepartmentId?: number | null;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

