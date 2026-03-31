import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMasterDataDefinitionDto {
  @IsInt()
  projectId: number;

  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  supportsHierarchy?: boolean;

  @IsBoolean()
  @IsOptional()
  hasValidityPeriod?: boolean;

  @IsBoolean()
  @IsOptional()
  mapDepartment?: boolean;

  @IsBoolean()
  @IsOptional()
  mapSubDepartment?: boolean;

  @IsInt()
  @IsOptional()
  defaultDepartmentId?: number;

  @IsInt()
  @IsOptional()
  defaultSubDepartmentId?: number;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
