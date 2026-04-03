import { IsBoolean, IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateMasterDataDto {
  @IsInt()
  masterId: number;

  @IsInt()
  tenantId: number;

  @IsInt()
  @IsOptional()
  projectId?: number;

  @ValidateIf((o) => o.data !== undefined)
  @IsOptional()
  data?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  valid_from?: string;

  @IsString()
  @IsOptional()
  valid_to?: string;

  @IsInt()
  @IsOptional()
  sort_order?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
