import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: 'tenant' })
  role!: string;

  @Prop({
    type: String,
    default: null,
  })
  resetPasswordToken!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  resetPasswordExpires!: Date | null;
}

export const UserSchema =
  SchemaFactory.createForClass(User);