import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alert, AlertSchema } from './schemas/alert.schema';
import { Inspection, InspectionSchema } from '../inspections/schemas/inspection.schema';
import { GatewayModule } from '../gateway/gateway.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    GatewayModule,
    MongooseModule.forFeature([
      { name: Alert.name, schema: AlertSchema },
      { name: Inspection.name, schema: InspectionSchema },
    ]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
