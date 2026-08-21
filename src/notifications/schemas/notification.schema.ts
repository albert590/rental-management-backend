import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument =
  HydratedDocument<Notification>;

@Schema({
  timestamps: true,
})
export class Notification {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  message!: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'payment',
      'lease',
      'maintenance',
      'system',
    ],
    default: 'system',
  })
  type!: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  read!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  recipient?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    default: null,
  })
  tenant?: Types.ObjectId | null;

  @Prop({
    type: String,
    default: null,
  })
  referenceId?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  referenceType?: string | null;
}

export const NotificationSchema =
  SchemaFactory.createForClass(Notification);