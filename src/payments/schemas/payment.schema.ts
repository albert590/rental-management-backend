import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentMethod {
  MPESA = 'mpesa',
  CASH = 'cash',
  BANK = 'bank',
}

@Schema({ timestamps: true })
export class Payment {
  // ==============================
  // RENTAL / LEASE
  // ==============================

  @Prop({
    type: Types.ObjectId,
    ref: 'Lease',
    required: true,
    index: true,
  })
  lease!: Types.ObjectId;

  // ==============================
  // PAYMENT DETAILS
  // ==============================

  @Prop({
    required: true,
    min: 1,
  })
  amount!: number;

  @Prop({
    required: true,
    default: Date.now,
  })
  paymentDate!: Date;

  @Prop({
    type: String,
    enum: PaymentMethod,
    default: PaymentMethod.MPESA,
  })
  paymentMethod!: PaymentMethod;

  @Prop({
    trim: true,
  })
  reference?: string;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    index: true,
  })
  status!: PaymentStatus;

  // ==============================
  // M-PESA DETAILS
  // ==============================

  @Prop({
    trim: true,
  })
  phoneNumber?: string;

  @Prop({
    trim: true,
  })
  accountReference?: string;

  @Prop({
    trim: true,
  })
  transactionDesc?: string;

  @Prop({
    trim: true,
    index: true,
  })
  merchantRequestId?: string;

  @Prop({
    trim: true,
    index: true,
  })
  checkoutRequestId?: string;

  @Prop({
    trim: true,
    index: true,
  })
  mpesaReceiptNumber?: string;

  @Prop({
    trim: true,
  })
  resultCode?: string;

  @Prop({
    trim: true,
  })
  resultDescription?: string;

  @Prop({
    trim: true,
  })
  transactionDate?: string;

  // ==============================
  // PAYMENT MODE
  // ==============================

  @Prop({
    default: 'mock',
    enum: ['mock', 'daraja'],
  })
  mode!: string;
}

export const PaymentSchema =
  SchemaFactory.createForClass(Payment);