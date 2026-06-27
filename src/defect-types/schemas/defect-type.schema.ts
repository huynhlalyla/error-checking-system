import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DefectTypeDocument = DefectType & Document;

@Schema({ timestamps: true })
export class DefectType {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  severity: string;

  @Prop({ default: 0 })
  sampleCount: number;

  @Prop({ default: 0 })
  lastTrainedSampleCount: number;

  @Prop([{
    filePath: String,
    uploadedBy: { type: Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }])
  sampleImages: any[];

  @Prop({ default: true })
  isActive: boolean;
}

export const DefectTypeSchema = SchemaFactory.createForClass(DefectType);
