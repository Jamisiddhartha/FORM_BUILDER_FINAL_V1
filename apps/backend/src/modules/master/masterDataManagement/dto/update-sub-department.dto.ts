import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSubDepartmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
