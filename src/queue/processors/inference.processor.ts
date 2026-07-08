import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { QUEUE_INFERENCE, JOB_INFERENCE } from '../queue.constants';
import { Image, ImageDocument } from '../../images/schemas/image.schema';
import { Inspection } from '../../inspections/schemas/inspection.schema';
import { Sample, SampleDocument } from '../../samples/schemas/sample.schema';
import { AiModel } from '../../ai-model/schemas/ai-model.schema';
import { AlertsService } from '../../alerts/alerts.service';
import { EventsGateway } from '../../gateway/events.gateway';

@Processor(QUEUE_INFERENCE)
export class InferenceProcessor {
  private readonly logger = new Logger(InferenceProcessor.name);

  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    @InjectModel(Inspection.name) private inspectionModel: Model<any>,
    @InjectModel(Sample.name) private sampleModel: Model<SampleDocument>,
    @InjectModel(AiModel.name) private aiModelModel: Model<any>,
    private configService: ConfigService,
    private alertsService: AlertsService,
    private eventsGateway: EventsGateway,
  ) {}

  @Process(JOB_INFERENCE)
  async handleInference(job: Job<{ imageId: string; filePath: string; productId: string; location: string }>) {
    const { imageId, filePath, productId, location } = job.data;
    this.logger.log(`Running inference for image ${imageId}`);

    try {
      const aiUrl = this.configService.get<string>('AI_SERVICE_URL');
      const internalKey = this.configService.get<string>('INTERNAL_API_KEY');

      const FormData = require('form-data');
      const fs = require('fs');
      const form = new FormData();
      form.append('image', fs.createReadStream(filePath));

      const response = await axios.post(`${aiUrl}/inference`, form, {
        headers: { ...form.getHeaders(), 'x-internal-key': internalKey },
        timeout: 30000,
      });

      const { label, confidence, is_unknown } = response.data;

      const threshold = this.configService.get<number>('CONFIDENCE_THRESHOLD') ?? 0.7;

      let sampleDoc: SampleDocument | null = null;
      const hasLabel = !is_unknown && label && label.trim() !== '';
      if (hasLabel) {
        sampleDoc = await this.sampleModel.findOne({
          code: { $regex: new RegExp(`^${label.trim()}$`, 'i') },
        });
      }

      let isUnknown: boolean;
      if (!hasLabel && !is_unknown) {
        // AI tự tin: ảnh không có lỗi
        isUnknown = false;
      } else if (is_unknown) {
        isUnknown = true;
      } else if (!sampleDoc) {
        isUnknown = true;
        this.logger.warn(`Sample code "${label}" not found in DB, marking as unknown`);
      } else {
        isUnknown = confidence < threshold;
      }

      const activeModel = await this.aiModelModel.findOne({ status: 'active' }).sort({ activatedAt: -1 });

      await this.imageModel.findByIdAndUpdate(imageId, {
        predictedLabel: sampleDoc?._id ?? null,
        confidence,
        isUnknown,
        status: isUnknown ? 'pending' : 'approved',
      });

      const isDefective = !isUnknown && !!sampleDoc && sampleDoc.type === 'DEFECT';

      const inspectionRecord = await this.inspectionModel.create({
        imageId,
        productId,
        location,
        detectedSample: sampleDoc?._id ?? null,
        isDefective,
        isUnknown,
        modelVersion: activeModel?.version ?? 'unknown',
        inspectedAt: new Date(),
      });

      const populatedInspection = await this.inspectionModel
        .findById(inspectionRecord._id)
        .populate('imageId', 'filePath source confidence')
        .populate('detectedSample', 'code name type')
        .exec();

      if (populatedInspection) {
        this.eventsGateway.emitInspectionResult(populatedInspection);
      }

      await this.alertsService.analyzeAndAlert(location, sampleDoc?._id?.toString());

      this.logger.log(`Inference done for ${imageId}: ${label} (${(confidence * 100).toFixed(1)}%)`);
    } catch (err) {
      this.logger.error(`Inference failed for ${imageId}: ${err.message}`);
      await this.imageModel.findByIdAndUpdate(imageId, {
        isUnknown: true,
        status: 'pending',
        note: `AI inference failed: ${err.message}`,
      }).catch(() => {});
      throw err;
    }
  }
}
