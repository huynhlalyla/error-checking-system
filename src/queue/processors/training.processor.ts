import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { QUEUE_TRAINING, JOB_TRAINING } from '../queue.constants';
import { AiModel } from '../../ai-model/schemas/ai-model.schema';
import { EventsGateway } from '../../gateway/events.gateway';

@Processor(QUEUE_TRAINING)
export class TrainingProcessor {
  private readonly logger = new Logger(TrainingProcessor.name);

  constructor(
    @InjectModel(AiModel.name) private aiModelModel: Model<any>,
    private configService: ConfigService,
    private eventsGateway: EventsGateway,
  ) {}

  @Process(JOB_TRAINING)
  async handleTraining(job: Job<{ modelId: string; sampleIds: string[] }>) {
    const { modelId, sampleIds } = job.data;
    this.logger.log(`Starting training for model ${modelId}`);

    try {
      const aiUrl = this.configService.get<string>('AI_SERVICE_URL');
      const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

      await this.aiModelModel.findByIdAndUpdate(modelId, {
        status: 'training',
        trainStartedAt: new Date(),
      });

      // Gọi Python bắt đầu training (async - Python tự gọi callback khi xong)
      await axios.post(
        `${aiUrl}/train`,
        { model_id: modelId, sample_ids: sampleIds },
        { headers: { 'x-internal-key': internalKey }, timeout: 10000 },
      );

      this.logger.log(`Training job dispatched to AI service for model ${modelId}`);
    } catch (err) {
      this.logger.error(`Failed to dispatch training job: ${err.message}`);
      await this.aiModelModel.findByIdAndUpdate(modelId, { status: 'archived' });
      throw err;
    }
  }
}
