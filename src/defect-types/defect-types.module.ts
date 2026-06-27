import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DefectTypesController } from './defect-types.controller';
import { DefectTypesService } from './defect-types.service';
import { DefectType, DefectTypeSchema } from './schemas/defect-type.schema';
import { AiModelModule } from '../ai-model/ai-model.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DefectType.name, schema: DefectTypeSchema }]),
    forwardRef(() => AiModelModule),
  ],
  controllers: [DefectTypesController],
  providers: [DefectTypesService],
  exports: [DefectTypesService],
})
export class DefectTypesModule {}
