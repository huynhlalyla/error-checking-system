import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inspection, InspectionDocument } from './schemas/inspection.schema';
import { Image, ImageDocument } from '../images/schemas/image.schema';
import { AiModel, AiModelDocument } from '../ai-model/schemas/ai-model.schema';
import { Alert, AlertDocument } from '../alerts/schemas/alert.schema';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class InspectionsService {
  private readonly logger = new Logger(InspectionsService.name);

  constructor(
    @InjectModel(Inspection.name) private inspectionModel: Model<InspectionDocument>,
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    @InjectModel(AiModel.name) private aiModelModel: Model<AiModelDocument>,
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll(options: {
    page: number;
    limit: number;
    location?: string;
    defectType?: string;
    isDefective?: boolean;
    from?: string;
    to?: string;
  }) {
    const filter: any = {};
    if (options.location) filter.location = options.location;
    if (options.defectType) filter.defectType = options.defectType;
    if (options.isDefective !== undefined) filter.isDefective = options.isDefective;
    if (options.from || options.to) {
      filter.inspectedAt = {};
      if (options.from) filter.inspectedAt.$gte = new Date(options.from);
      if (options.to) filter.inspectedAt.$lte = new Date(options.to);
    }

    const skip = (options.page - 1) * options.limit;
    const [data, total] = await Promise.all([
      this.inspectionModel
        .find(filter)
        .populate('imageId', 'filePath source confidence')
        .populate('defectType', 'code name severity')
        .sort({ inspectedAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.inspectionModel.countDocuments(filter),
    ]);

    return { data, total, page: options.page, limit: options.limit };
  }

  async markAsIncorrect(id: string) {
    const inspection = await this.inspectionModel.findById(id);
    if (!inspection) throw new NotFoundException('Inspection not found');

    if (inspection.isIncorrect) return inspection;

    // 1. Đánh dấu isIncorrect
    inspection.isIncorrect = true;
    await inspection.save();

    // 2. Chuyển ảnh về trạng thái chờ duyệt (pending) & unknown
    await this.imageModel.findByIdAndUpdate(inspection.imageId, {
      status: 'pending',
      isUnknown: true,
    });

    // Phát event để cập nhật list inspection bên UI (loại bỏ hoặc gạch ngang)
    // Và báo cho dashboard có thêm ảnh pending
    this.eventsGateway.server.emit('imagePendingCountUpdate');

    // 3. Tính toán lại độ chính xác của model hiện tại
    const activeModel = await this.aiModelModel.findOne({ status: 'active' });
    if (activeModel) {
      const [total, incorrect] = await Promise.all([
        this.inspectionModel.countDocuments({ modelVersion: activeModel.version }),
        this.inspectionModel.countDocuments({ modelVersion: activeModel.version, isIncorrect: true }),
      ]);

      if (total >= 10) {
        const accuracy = (total - incorrect) / total;
        
        // Nếu độ chính xác < 90%
        if (accuracy < 0.90) {
          // Kiểm tra xem đã cảnh báo trong vòng 24h chưa
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentAlert = await this.alertModel.findOne({
            type: 'model_retrain_needed',
            createdAt: { $gte: oneDayAgo },
          });

          if (!recentAlert) {
            const alert = await this.alertModel.create({
              type: 'model_retrain_needed',
              severity: 'critical',
              message: `Mô hình AI hiện tại (v${activeModel.version}) đang có độ chính xác dưới mức quy định (${(accuracy * 100).toFixed(1)}% < 90%). Yêu cầu huấn luyện lại bằng các dữ liệu đã được đính chính.`,
            });
            this.eventsGateway.emitAlert(alert);
            this.logger.warn(`Generated model_retrain_needed alert. Accuracy: ${(accuracy * 100).toFixed(1)}%`);
          }
        }
      }
    }

    return inspection;
  }

  async getStats(from?: string, to?: string) {
    const dateFilter: any = {};
    if (from || to) {
      dateFilter.inspectedAt = {};
      if (from) dateFilter.inspectedAt.$gte = new Date(from);
      if (to) dateFilter.inspectedAt.$lte = new Date(to);
    }

    const [totalCount, defectiveCount, byDefectType, byLine, byDay] = await Promise.all([
      this.inspectionModel.countDocuments(dateFilter),
      this.inspectionModel.countDocuments({ ...dateFilter, isDefective: true }),

      // Phân bổ theo loại lỗi
      this.inspectionModel.aggregate([
        { $match: { ...dateFilter, isDefective: true } },
        { $group: { _id: '$defectType', count: { $sum: 1 } } },
        { $lookup: { from: 'defecttypes', localField: '_id', foreignField: '_id', as: 'defectType' } },
        { $unwind: { path: '$defectType', preserveNullAndEmptyArrays: true } },
        { $project: { code: '$defectType.code', name: '$defectType.name', count: 1 } },
        { $sort: { count: -1 } },
      ]),

      // Phân bổ theo vị trí
      this.inspectionModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$location',
            total: { $sum: 1 },
            defective: { $sum: { $cond: ['$isDefective', 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Xu hướng theo ngày
      this.inspectionModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$inspectedAt' } },
            total: { $sum: 1 },
            defective: { $sum: { $cond: ['$isDefective', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      total: totalCount,
      defective: defectiveCount,
      defectRate: totalCount > 0 ? (defectiveCount / totalCount) : 0,
      byDefectType,
      byLine,
      byDay,
    };
  }
}
