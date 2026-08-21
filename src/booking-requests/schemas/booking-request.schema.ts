import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BookingRequestDocument =
  HydratedDocument<BookingRequest>;

@Schema({ timestamps: true })
export class BookingRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  tenant!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Unit',
    required: true,
  })
  unit!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  property!: Types.ObjectId;

  @Prop({
    type: String,
    default: '',
  })
  message!: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status!: string;
}

export const BookingRequestSchema =
  SchemaFactory.createForClass(BookingRequest);