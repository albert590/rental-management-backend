import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UnitDocument = HydratedDocument<Unit>;

@Schema({ timestamps: true })
export class Unit {
  @Prop({ required: true, trim: true })
  unitNumber!: string;

  @Prop({ required: true, min: 0 })
  floor!: number;

  @Prop({ required: true, min: 0 })
  bedrooms!: number;

  @Prop({ required: true, min: 0 })
  monthlyRent!: number;

  @Prop({
    default: 'available',
    enum: ['available', 'occupied', 'maintenance'],
  })
  status!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property!: Types.ObjectId;

  // Main/general unit image
  @Prop({
    type: String,
    default: '',
  })
  generalImage!: string;

  // Bedroom image
  @Prop({
    type: String,
    default: '',
  })
  bedroomImage!: string;

  // Bathroom image
  @Prop({
    type: String,
    default: '',
  })
  bathroomImage!: string;

  // Toilet image
  @Prop({
    type: String,
    default: '',
  })
  toiletImage!: string;

  // Main image fallback
  @Prop({
    type: String,
    default: '',
  })
  image!: string;

  // All uploaded unit images
  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];
}

export const UnitSchema = SchemaFactory.createForClass(Unit);