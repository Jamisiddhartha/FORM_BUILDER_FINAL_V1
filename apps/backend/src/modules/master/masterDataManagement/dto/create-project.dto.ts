import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateMasterDataProjectDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
