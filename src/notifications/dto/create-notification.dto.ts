import {
  IsMongoId,
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsIn([
    'payment',
    'lease',
    'maintenance',
    'system',
  ])
  type!: string;

  @IsOptional()
  @IsMongoId()
  recipient?: string;

  @IsOptional()
  @IsMongoId()
  tenant?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsBoolean()
  read?: boolean;
}