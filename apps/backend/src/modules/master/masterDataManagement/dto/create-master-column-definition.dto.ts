import { ColumnDataType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  isObject,
} from 'class-validator';

export class CreateMasterColumnDefinitionDto {
  @IsInt()
  masterId: number;

  @IsString()
  columnKey: string;

  @IsString()
  columnLabel: string;

  @IsEnum(ColumnDataType)
  dataType: ColumnDataType;

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
