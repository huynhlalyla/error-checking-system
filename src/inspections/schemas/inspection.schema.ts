import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InspectionDocument = Inspection & Document;

@Schema({ timestamps: true })
export class Inspection {
  @Prop({ type: Types.ObjectId, ref: 'Image', required: true })
  imageId: Types.ObjectId;

  @Prop({ trim: true })
  productId: string;

  @Prop({ trim: true })
  location: string;

  @Prop({ type: Types.ObjectId, ref: 'DefectType', default: null })
  defectType: Types.ObjectId;

  @Prop({ default: false })
  isDefective: boolean;

  @Prop({ default: false })
  isUnknown: boolean;

  @Prop({ default: false })
  isIncorrect: boolean;

  @Prop({ trim: true })
  modelVersion: string;

  @Prop({ default: Date.now })
  inspectedAt: Date;
}

export const InspectionSchema = SchemaFactory.createForClass(Inspection);
InspectionSchema.index({ location: 1, inspectedAt: -1 });
InspectionSchema.index({ defectType: 1, inspectedAt: -1 });
