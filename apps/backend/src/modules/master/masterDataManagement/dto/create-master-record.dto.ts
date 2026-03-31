import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateMasterDataRecordDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  parentId?: number | null;

  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  validFrom?: string | null;

  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
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
