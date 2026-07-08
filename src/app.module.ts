import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SamplesModule } from './samples/samples.module';
import { ImagesModule } from './images/images.module';
import { InspectionsModule } from './inspections/inspections.module';
import { ReviewModule } from './review/review.module';
import { AiModelModule } from './ai-model/ai-model.module';
import { AlertsModule } from './alerts/alerts.module';
import { QueueModule } from './queue/queue.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    SamplesModule,
    ImagesModule,
    InspectionsModule,
    ReviewModule,
    AiModelModule,
    AlertsModule,
    QueueModule,
    GatewayModule,
  ],
})
export class AppModule {}
