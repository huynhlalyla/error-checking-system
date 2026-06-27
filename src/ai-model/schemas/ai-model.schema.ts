import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiModelDocument = AiModel & Document;

@Schema({ timestamps: true })
export class AiModel {
  @Prop({ required: true, trim: true })
  version: string;

  @Prop({ required: true, enum: ['training', 'active', 'archived'], default: 'training' })
  status: string;

  @Prop({ type: Number, min: 0, max: 1, default: null })
  accuracy: number;

  @Prop({ default: 0 })
  trainedOn: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'DefectType' }], default: [] })
  defectTypes: Types.ObjectId[];

  @Prop({ default: null })
  trainStartedAt: Date;

  @Prop({ default: null })
  trainCompletedAt: Date;

  @Prop({ default: null })
  activatedAt: Date;

  @Prop({ default: null })
  reason: string;

  @Prop({ default: 0 })
  retryCount: number;
}

export const AiModelSchema = SchemaFactory.createForClass(AiModel);
