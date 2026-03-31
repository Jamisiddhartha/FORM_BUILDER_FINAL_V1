import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSubDepartmentDto {
  @IsInt()
  departmentId: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
