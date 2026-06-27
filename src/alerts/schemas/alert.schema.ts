import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AlertDocument = Alert & Document;

@Schema({ timestamps: true })
export class Alert {
  @Prop({
    required: true,
    enum: ['high_defect_rate', 'new_defect_pattern', 'line_issue', 'model_updated', 'model_retrain_needed'],
  })
  type: string;

  @Prop({ required: true, enum: ['warning', 'critical'] })
  severity: string;

  @Prop({ trim: true })
  location: string;

  @Prop({ type: Types.ObjectId, ref: 'DefectType', default: null })
  defectType: Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
