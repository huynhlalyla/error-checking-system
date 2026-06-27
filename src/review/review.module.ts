import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { Image, ImageSchema } from '../images/schemas/image.schema';
import { AiModel, AiModelSchema } from '../ai-model/schemas/ai-model.schema';
import { DefectTypesModule } from '../defect-types/defect-types.module';
import { QUEUE_TRAINING } from '../queue/queue.constants';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    DefectTypesModule,
    BullModule.registerQueue({ name: QUEUE_TRAINING }),
    MongooseModule.forFeature([
      { name: Image.name, schema: ImageSchema },
      { name: AiModel.name, schema: AiModelSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
