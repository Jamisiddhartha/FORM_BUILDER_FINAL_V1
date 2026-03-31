import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateMasterDataDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

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
  defaultDepartmentId?: number | null;

  @IsInt()
  @IsOptional()
  defaultSubDepartmentId?: number | null;

  @IsDateString()
  @IsOptional()
  validFrom?: string | null;

  @IsDateString()
  @IsOptional()
  validTo?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
