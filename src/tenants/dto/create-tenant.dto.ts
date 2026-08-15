import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateTenantDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsPhoneNumber()
  phone!: string;

  @IsNotEmpty()
  @IsString()
  idNumber!: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}