import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeaseDocument = HydratedDocument<Lease>;

@Schema({ timestamps: true })
export class Lease {
  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    required: true,
  })
  tenant!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Unit',
    required: true,
  })
  unit!: Types.ObjectId;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ required: true, min: 0 })
  monthlyRent!: number;

  @Prop({ required: true, min: 0 })
  securityDeposit!: number;

  @Prop({
    default: 'active',
    enum: ['active', 'expired', 'terminated'],
  })
  status!: string;
}

export const LeaseSchema = SchemaFactory.createForClass(Lease);