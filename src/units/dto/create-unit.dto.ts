import {
  IsArray,
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

  // Main/general unit image
  @IsOptional()
  @IsString()
  generalImage?: string;

  // Bedroom image
  @IsOptional()
  @IsString()
  bedroomImage?: string;

  // Bathroom image
  @IsOptional()
  @IsString()
  bathroomImage?: string;

  // Toilet image
  @IsOptional()
  @IsString()
  toiletImage?: string;

  // Main image fallback
  @IsOptional()
  @IsString()
  image?: string;

  // All uploaded unit images
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}