import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ImageDocument = Image & Document;

@Schema({ timestamps: true })
export class Image {
  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true, enum: ['aoi_machine', 'inspector'] })
  source: string;

  @Prop({ trim: true })
  productId: string;

  @Prop({ trim: true })
  location: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'DefectType', default: null })
  predictedLabel: Types.ObjectId;

  @Prop({ type: Number, min: 0, max: 1, default: null })
  confidence: number;

  @Prop({ default: false })
  isUnknown: boolean;

  @Prop({ type: Types.ObjectId, ref: 'DefectType', default: null })
  reviewedLabel: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId;

  @Prop({ default: null })
  reviewedAt: Date;

  @Prop({ trim: true })
  note: string;
}

export const ImageSchema = SchemaFactory.createForClass(Image);
