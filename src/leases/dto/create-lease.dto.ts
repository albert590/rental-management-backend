import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateLeaseDto {
  @IsNotEmpty()
  @IsMongoId()
  tenant!: string;

  @IsNotEmpty()
  @IsMongoId()
  unit!: string;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(0)
  monthlyRent!: number;

  @IsNumber()
  @Min(0)
  securityDeposit!: number;

  @IsOptional()
  @IsIn(['active', 'expired', 'terminated'])
  status?: string;
}