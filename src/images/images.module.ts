import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { Image, ImageSchema } from './schemas/image.schema';
import { UsersModule } from '../users/users.module';
import { QUEUE_INFERENCE } from '../queue/queue.constants';
import { ConfigModule } from '@nestjs/config';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    GatewayModule,
    BullModule.registerQueue({ name: QUEUE_INFERENCE }),
    MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }]),
  ],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
