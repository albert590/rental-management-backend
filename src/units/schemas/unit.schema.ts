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
}

export const UnitSchema = SchemaFactory.createForClass(Unit);