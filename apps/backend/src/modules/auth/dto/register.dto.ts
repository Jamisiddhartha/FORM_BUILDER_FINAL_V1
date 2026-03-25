import { IsEmail, IsNotEmpty, MinLength, IsInt, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsInt()
  roleId?: number;

  @IsOptional()
  pan?: string;

  @IsOptional()
  mobile?: string;

  @IsOptional()
  legalEntityName?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  country?: string;

  @IsOptional()
  state?: string;

  @IsOptional()
  district?: string;

  @IsOptional()
  pinCode?: string;

  @IsOptional()
  cons_pan?: string;

  @IsOptional()
  cons_mobile?: string;

  @IsOptional()
  cons_fullName?: string;

  @IsOptional()
  cons_email?: string;

  @IsOptional()
  cons_country?: string;

  @IsOptional()
  cons_state?: string;
}
