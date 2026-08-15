import {
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateUnitDto {
  @IsNotEmpty()
  @IsString()
  unitNumber!: string;

  @IsInt()
  @Min(0)
  floor!: number;

  @IsInt()
  @Min(0)
  bedrooms!: number;

  @IsNumber()
  @Min(0)
  monthlyRent!: number;

  @IsOptional()
  @IsIn(['available', 'occupied', 'maintenance'])
  status?: string;

  @IsNotEmpty()
  @IsMongoId()
  property!: string;
}