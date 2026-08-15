import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  idNumber!: string;

  @Prop({ default: '', trim: true })
  emergencyContact!: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);