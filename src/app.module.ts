import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DefectTypesModule } from './defect-types/defect-types.module';
import { ImagesModule } from './images/images.module';
import { InspectionsModule } from './inspections/inspections.module';
import { ReviewModule } from './review/review.module';
import { AiModelModule } from './ai-model/ai-model.module';
import { AlertsModule } from './alerts/alerts.module';
import { QueueModule } from './queue/queue.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    // Config từ .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Schedule (cron jobs)
    ScheduleModule.forRoot(),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    // Bull Queue (Redis)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // Feature modules
    GatewayModule,
    QueueModule,
    AuthModule,
    UsersModule,
    DefectTypesModule,
    ImagesModule,
    InspectionsModule,
    ReviewModule,
    AiModelModule,
    AlertsModule,
  ],
})
export class AppModule {}
