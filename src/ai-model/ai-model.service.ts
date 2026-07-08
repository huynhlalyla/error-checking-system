import { Injectable, NotFoundException, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { AiModel } from './schemas/ai-model.schema';
import { SamplesService } from '../samples/samples.service';
import { EventsGateway } from '../gateway/events.gateway';
import { QUEUE_TRAINING, JOB_TRAINING } from '../queue/queue.constants';

@Injectable()
export class AiModelService {
  private autoTrainTimeout: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(AiModel.name) private aiModelModel: Model<any>,
    @InjectQueue(QUEUE_TRAINING) private trainingQueue: Queue,
    @Inject(forwardRef(() => SamplesService)) private samplesService: SamplesService,
    private eventsGateway: EventsGateway,
    private configService: ConfigService,
  ) {}

  async getCurrent() {
    return this.aiModelModel
      .findOne({ status: 'active' })
      .populate('trainedSamples', 'code name type targetProductId')
      .sort({ activatedAt: -1 });
  }

  async getHistory(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.aiModelModel
        .find()
        .populate('trainedSamples', 'code name type targetProductId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.aiModelModel.countDocuments(),
    ]);
    return { data, total, page, limit };
  }

  async triggerManualTraining() {
    const activeSamples = await this.samplesService.findAll(true);
    const sampleIds = activeSamples.map((s) => s._id.toString());
    const version = `v${Date.now()}`;
    const newModel = await this.aiModelModel.create({
      version,
      status: 'training',
      trainedSamples: sampleIds,
      trainStartedAt: new Date(),
    });
    await this.trainingQueue.add(JOB_TRAINING, {
      modelId: newModel._id.toString(),
      sampleIds, // was defectTypeIds
    });
    return newModel;
  }

  async getTrainingDataset() {
    const activeSamples = await this.samplesService.findAll(true);
    const classes = activeSamples.map((s) => s.code);
    const samples: any[] = [];
    for (const sample of activeSamples) {
      if (!sample.sampleImages) continue;
      for (const img of sample.sampleImages) {
        samples.push({ filePath: img.filePath, label: sample.code });
      }
    }
    return { classes, samples };
  }

  async predict(fileBuffer: Buffer, filename: string) {
    const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');
    const apiKey = this.configService.get<string>('INTERNAL_API_KEY');

    const form = new FormData();
    form.append('image', fileBuffer, { filename });

    try {
      const response = await axios.post(`${aiServiceUrl}/inference`, form, {
        headers: {
          ...form.getHeaders(),
          'x-internal-key': apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('AI Service predict error:', error.response?.data || error.message);
      throw new InternalServerErrorException(`AI Service error: ${error.response?.data?.detail || error.message}`);
    }
  }

  async onTrainingComplete(modelId: string, accuracy: number, trainedOn: number) {
    const model = await this.aiModelModel.findById(modelId);
    if (!model) throw new NotFoundException('Model not found');

    await this.aiModelModel.updateMany(
      { status: 'active' },
      { status: 'archived' },
    );

    const activeSamples = await this.samplesService.findAll(true);
    for (const s of activeSamples) {
      await this.samplesService.updateLastTrainedSampleCount(s._id.toString(), s.sampleCount);
    }

    const activated = await this.aiModelModel.findByIdAndUpdate(
      modelId,
      {
        status: 'active',
        accuracy,
        trainedOn,
        trainCompletedAt: new Date(),
        activatedAt: new Date(),
      },
      { new: true },
    ).populate('trainedSamples', 'code name type targetProductId');

    this.eventsGateway.emitModelUpdated(activated);
    return activated;
  }

  async checkAutoTraining(reason?: string) {
    if (this.autoTrainTimeout) {
      clearTimeout(this.autoTrainTimeout);
    }

    this.autoTrainTimeout = setTimeout(async () => {
      this.autoTrainTimeout = null;
      try {
        const isTraining = await this.aiModelModel.exists({ status: 'training' });
        if (isTraining) return;

        let shouldTrain = false;
        let actualReason = reason;

        if (!shouldTrain && !reason) {
          const activeSamples = await this.samplesService.findAll(true);
          for (const s of activeSamples) {
            if (Math.abs(s.sampleCount - s.lastTrainedSampleCount) >= 10) {
              shouldTrain = true;
              actualReason = `Tự động huấn luyện: Mẫu vật ${s.code} có số lượng ảnh thay đổi (${s.lastTrainedSampleCount} -> ${s.sampleCount})`;
              break;
            }
          }
        } else if (reason) {
          shouldTrain = true;
        }

        if (shouldTrain) {
          const stillTraining = await this.aiModelModel.exists({ status: 'training' });
          if (!stillTraining) {
            await this.triggerManualTraining();
            console.log(`Auto Training Triggered: ${actualReason}`);
          }
        }
      } catch (error) {
        console.error('Error during auto-training check:', error);
      }
    }, 5000);
  }

  async getTrainingProgress() {
    const aiUrl = this.configService.get<string>('AI_SERVICE_URL');
    try {
      const { data } = await axios.get(`${aiUrl}/train/progress`, { timeout: 3000 });
      return data;
    } catch (e) {
      return { is_training: false, model_id: null, progress: 0, message: 'Không thể kết nối đến AI Service' };
    }
  }

  async onTrainingFailed(modelId: string, reason: string) {
    const model = await this.aiModelModel.findById(modelId);
    if (!model) return null;

    if (model.retryCount < 2 && reason !== 'Đã gửi yêu cầu huỷ huấn luyện') {
      model.retryCount += 1;
      model.status = 'training';
      await model.save();

      await this.trainingQueue.add(JOB_TRAINING, {
        modelId: model._id.toString(),
        sampleIds: model.trainedSamples.map((id: any) => id.toString()),
      });
      console.log(`Model ${modelId} failed (${reason}). Retrying... (${model.retryCount}/2)`);
      this.eventsGateway.emitModelUpdated(model);
      return model;
    }

    const failed = await this.aiModelModel.findByIdAndUpdate(
      modelId,
      {
        status: 'archived',
        trainCompletedAt: new Date(),
        reason,
      },
      { new: true },
    );
    this.eventsGateway.emitModelUpdated(failed);
    return failed;
  }

  async cancelTraining(id: string) {
    const model = await this.aiModelModel.findById(id);
    if (!model || model.status !== 'training') {
      throw new NotFoundException('Model is not training or not found');
    }

    const aiUrl = this.configService.get<string>('AI_SERVICE_URL');
    const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

    try {
      await axios.post(
        `${aiUrl}/train/cancel`,
        {},
        { headers: { 'x-internal-key': internalKey }, timeout: 5000 },
      );
    } catch (e) {
      console.error('Failed to send cancel request to AI Service', e);
    }

    return this.onTrainingFailed(id, 'Đã gửi yêu cầu huỷ huấn luyện');
  }

  async deleteModel(id: string) {
    const model = await this.aiModelModel.findById(id);
    if (!model) throw new NotFoundException('Model not found');
    
    if (model.status === 'active' || model.status === 'training') {
      throw new Error('Cannot delete active or training model');
    }

    await this.aiModelModel.findByIdAndDelete(id);
    return { success: true };
  }
}
