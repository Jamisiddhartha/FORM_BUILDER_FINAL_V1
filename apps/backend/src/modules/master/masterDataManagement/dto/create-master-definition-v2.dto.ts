import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMasterDefinitionV2Dto {
  @IsInt()
  tenantId: number;

  @IsInt()
  @IsOptional()
  projectId?: number;

  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  allowImport?: boolean;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
