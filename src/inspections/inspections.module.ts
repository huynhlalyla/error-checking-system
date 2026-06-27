import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { Inspection, InspectionSchema } from './schemas/inspection.schema';
import { Image, ImageSchema } from '../images/schemas/image.schema';
import { AiModel, AiModelSchema } from '../ai-model/schemas/ai-model.schema';
import { Alert, AlertSchema } from '../alerts/schemas/alert.schema';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inspection.name, schema: InspectionSchema },
      { name: Image.name, schema: ImageSchema },
      { name: AiModel.name, schema: AiModelSchema },
      { name: Alert.name, schema: AlertSchema },
    ]),
    GatewayModule,
  ],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
