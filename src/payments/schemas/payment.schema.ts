import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({
    type: Types.ObjectId,
    ref: 'Lease',
    required: true,
  })
  lease!: Types.ObjectId;

  @Prop({
    required: true,
    min: 0,
  })
  amount!: number;

  @Prop({
    required: true,
  })
  paymentDate!: Date;

  @Prop()
  paymentMethod?: string;

  @Prop()
  reference?: string;

  @Prop({
    default: 'completed',
  })
  status!: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);