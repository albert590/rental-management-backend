import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MaintenanceDocument = HydratedDocument<Maintenance>;

@Schema({ timestamps: true })
export class Maintenance {
  @Prop({
    type: Types.ObjectId,
    ref: 'Unit',
    required: true,
  })
  unit!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    required: true,
  })
  tenant!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  description!: string;

  @Prop({
    default: 'medium',
  })
  priority!: string;

  @Prop({
    default: 'pending',
  })
  status!: string;
}

export const MaintenanceSchema =
  SchemaFactory.createForClass(Maintenance);