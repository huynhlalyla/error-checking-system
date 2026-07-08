import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SamplesController } from './samples.controller';
import { SamplesService } from './samples.service';
import { Sample, SampleSchema } from './schemas/sample.schema';
import { AiModelModule } from '../ai-model/ai-model.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sample.name, schema: SampleSchema }]),
    forwardRef(() => AiModelModule),
  ],
  controllers: [SamplesController],
  providers: [SamplesService],
  exports: [SamplesService],
})
export class SamplesModule {}
