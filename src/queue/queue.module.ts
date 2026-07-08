import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { QUEUE_INFERENCE, QUEUE_TRAINING } from './queue.constants';
import { InferenceProcessor } from './processors/inference.processor';
import { TrainingProcessor } from './processors/training.processor';
import { Image, ImageSchema } from '../images/schemas/image.schema';
import { Inspection, InspectionSchema } from '../inspections/schemas/inspection.schema';
import { Sample, SampleSchema } from '../samples/schemas/sample.schema';
import { AiModel, AiModelSchema } from '../ai-model/schemas/ai-model.schema';
import { AlertsModule } from '../alerts/alerts.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    ConfigModule,
    AlertsModule,
    GatewayModule,
    BullModule.registerQueue(
      { name: QUEUE_INFERENCE },
      { name: QUEUE_TRAINING },
    ),
    MongooseModule.forFeature([
      { name: Image.name, schema: ImageSchema },
      { name: Inspection.name, schema: InspectionSchema },
      { name: Sample.name, schema: SampleSchema },
      { name: AiModel.name, schema: AiModelSchema },
    ]),
  ],
  providers: [InferenceProcessor, TrainingProcessor],
  exports: [BullModule],
})
export class QueueModule {}
