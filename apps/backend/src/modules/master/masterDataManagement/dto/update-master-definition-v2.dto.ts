import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateMasterDefinitionV2Dto {
  @IsInt()
  @IsOptional()
  projectId?: number | null;

  @IsString()
  @IsOptional()
  name?: string;

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
