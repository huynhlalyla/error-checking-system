import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { AiModelController } from './ai-model.controller';
import { AiModelService } from './ai-model.service';
import { AiModel, AiModelSchema } from './schemas/ai-model.schema';
import { SamplesModule } from '../samples/samples.module';
import { GatewayModule } from '../gateway/gateway.module';
import { QUEUE_TRAINING } from '../queue/queue.constants';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SamplesModule),
    GatewayModule,
    UsersModule,
    BullModule.registerQueue({ name: QUEUE_TRAINING }),
    MongooseModule.forFeature([{ name: AiModel.name, schema: AiModelSchema }]),
  ],
  controllers: [AiModelController],
  providers: [AiModelService],
  exports: [AiModelService],
})
export class AiModelModule {}
