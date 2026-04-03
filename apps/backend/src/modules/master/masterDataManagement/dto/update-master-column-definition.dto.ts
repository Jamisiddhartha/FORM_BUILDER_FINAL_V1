import { ColumnDataType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateMasterColumnDefinitionDto {
  @IsString()
  @IsOptional()
  columnLabel?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isUnique?: boolean;

  @IsBoolean()
  @IsOptional()
  isSearchable?: boolean;

  @IsBoolean()
  @IsOptional()
  isListable?: boolean;

  @IsBoolean()
  @IsOptional()
  isFilterable?: boolean;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ValidateIf((o) => o.options !== undefined)
  @IsOptional()
  options?: Record<string, any>;

  @ValidateIf((o) => o.validation !== undefined)
  @IsOptional()
  validation?: Record<string, any>;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;
}
