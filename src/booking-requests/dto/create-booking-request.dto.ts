import {
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBookingRequestDto {
  @IsMongoId()
  unitId!: string;

  @IsOptional()
  @IsString()
  message?: string;
}