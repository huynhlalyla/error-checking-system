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
import { DefectType, DefectTypeDocument } from '../../defect-types/schemas/defect-type.schema';
import { AiModel } from '../../ai-model/schemas/ai-model.schema';
import { AlertsService } from '../../alerts/alerts.service';
import { EventsGateway } from '../../gateway/events.gateway';

@Processor(QUEUE_INFERENCE)
export class InferenceProcessor {
  private readonly logger = new Logger(InferenceProcessor.name);

  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    @InjectModel(Inspection.name) private inspectionModel: Model<any>,
    @InjectModel(DefectType.name) private defectTypeModel: Model<DefectTypeDocument>,
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

      // Gọi Python AI service
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

      // Tìm DefectType theo code (case-insensitive để tránh miss-match)
      let defectTypeDoc: DefectTypeDocument | null = null;
      const hasLabel = !is_unknown && label && label.trim() !== '';
      if (hasLabel) {
        defectTypeDoc = await this.defectTypeModel.findOne({
          code: { $regex: new RegExp(`^${label.trim()}$`, 'i') },
        });
      }

      // Xác định isUnknown:
      // - AI báo unknown  → unknown
      // - Có label nhưng không tìm thấy loại lỗi trong DB → unknown (cần review)
      // - Có label, tìm thấy DB, nhưng confidence thấp → unknown
      // - AI báo không có lỗi (label null/empty, is_unknown=false) → KHÔNG unknown (đạt chuẩn)
      let isUnknown: boolean;
      if (!hasLabel && !is_unknown) {
        // AI tự tin: ảnh không có lỗi
        isUnknown = false;
      } else if (is_unknown) {
        isUnknown = true;
      } else if (!defectTypeDoc) {
        // Có label nhưng không match DB → cần review
        isUnknown = true;
        this.logger.warn(`DefectType code "${label}" not found in DB, marking as unknown`);
      } else {
        // Có label, có DB doc → kiểm tra ngưỡng confidence
        isUnknown = confidence < threshold;
      }

      // Lấy version model đang active
      const activeModel = await this.aiModelModel.findOne({ status: 'active' }).sort({ activatedAt: -1 });

      // Cập nhật image:
      // - isUnknown=true  → status='pending' (vào review)
      // - isUnknown=false → status='approved' (tự động duyệt, vào lịch sử kiểm tra)
      await this.imageModel.findByIdAndUpdate(imageId, {
        predictedLabel: defectTypeDoc?._id ?? null,
        confidence,
        isUnknown,
        status: isUnknown ? 'pending' : 'approved',
      });

      // Tạo inspection record
      const inspectionRecord = await this.inspectionModel.create({
        imageId,
        productId,
        location,
        defectType: defectTypeDoc?._id ?? null,
        isDefective: !isUnknown && !!defectTypeDoc,
        isUnknown,
        modelVersion: activeModel?.version ?? 'unknown',
        inspectedAt: new Date(),
      });

      // Populate data để gửi lên client
      const populatedInspection = await this.inspectionModel
        .findById(inspectionRecord._id)
        .populate('imageId', 'filePath source confidence')
        .populate('defectType', 'code name severity')
        .exec();

      if (populatedInspection) {
        this.eventsGateway.emitInspectionResult(populatedInspection);
      }

      // Kiểm tra ngưỡng cảnh báo
      await this.alertsService.analyzeAndAlert(location, defectTypeDoc?._id?.toString());

      this.logger.log(`Inference done for ${imageId}: ${label} (${(confidence * 100).toFixed(1)}%)`);
    } catch (err) {
      this.logger.error(`Inference failed for ${imageId}: ${err.message}`);
      // Đánh dấu ảnh là unknown để không bị kẹt ở trạng thái pending mãi
      // Ảnh sẽ xuất hiện trong queue review để nhân viên xử lý thủ công
      await this.imageModel.findByIdAndUpdate(imageId, {
        isUnknown: true,
        status: 'pending',
        note: `AI inference failed: ${err.message}`,
      }).catch(() => {});
      throw err;
    }
  }
}
