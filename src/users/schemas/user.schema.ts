import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { Role } from '../../common/decorators/roles.decorator';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ['admin', 'inspector', 'device'], default: 'inspector' })
  role: Role;

  @Prop({ unique: true, sparse: true })
  apiKey?: string;

  @Prop({ default: false })
  isFrozen: boolean;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
