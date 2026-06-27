import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Alert, AlertDocument } from './schemas/alert.schema';
import { Inspection } from '../inspections/schemas/inspection.schema';
import { EventsGateway } from '../gateway/events.gateway';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
    @InjectModel(Inspection.name) private inspectionModel: Model<any>,
    private eventsGateway: EventsGateway,
    private configService: ConfigService,
  ) {}

  async findAll(page = 1, limit = 20, unreadOnly = false) {
    const filter: any = {};
    if (unreadOnly) filter.isRead = false;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .populate('defectType', 'code name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.alertModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async markRead(id: string): Promise<void> {
    await this.alertModel.findByIdAndUpdate(id, { isRead: true });
  }

  async markAllRead(): Promise<void> {
    await this.alertModel.updateMany({ isRead: false }, { isRead: true });
  }

  async createAlert(data: {
    type: string;
    severity: string;
    location?: string;
    defectType?: string;
    message: string;
  }): Promise<AlertDocument> {
    const alert = await this.alertModel.create(data);
    const populated = await this.alertModel.findById(alert._id).populate('defectType', 'code name');
    this.eventsGateway.emitAlert(populated);
    return alert;
  }

  /** Phân tích ngưỡng cảnh báo sau mỗi lần inference */
  async analyzeAndAlert(location?: string, defectTypeId?: string): Promise<void> {
    if (!location) return;
    try {
      const now = new Date();
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // Lấy tổng số lượng kiểm tra trong 30p của dây chuyền
      const total = await this.inspectionModel.countDocuments({
        location,
        inspectedAt: { $gte: thirtyMinsAgo },
      });

      if (total < 10) return; // Bỏ qua nếu quá ít mẫu

      // Lấy số lượng lỗi
      const defectCount = await this.inspectionModel.countDocuments({
        location,
        isDefective: true,
        inspectedAt: { $gte: thirtyMinsAgo },
      });

      const rate = defectCount / total;
      const threshold = this.configService.get<number>('DEFECT_RATE_ALERT_THRESHOLD') ?? 0.3;

      if (rate >= threshold) {
        // Kiểm tra xem đã có cảnh báo rate_limit cho vị trí này trong 30p chưa
        const recentAlert = await this.alertModel.findOne({
          type: 'defect_rate_high',
          location,
          createdAt: { $gte: thirtyMinsAgo },
        });

        if (!recentAlert) {
          await this.createAlert({
            type: 'defect_rate_high',
            severity: 'high',
            location,
            message: `Tỷ lệ lỗi tại ${location} đang ở mức ${(rate * 100).toFixed(1)}% (vượt ngưỡng ${(threshold * 100).toFixed(1)}%)`,
          });
          this.logger.warn(`Alert generated: High defect rate at ${location}`);
        }
      }
    } catch (error) {
      this.logger.error('Error in analyzeAndAlert', error);
    }
  }

  /** Cron job phân tích tổng hợp mỗi 15 phút */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledAnalysis() {
    this.logger.log('Running scheduled defect rate analysis...');
    const locations: { _id: string }[] = await this.inspectionModel.distinct('location');
    for (const loc of locations) {
      await this.analyzeAndAlert(loc as any);
    }
  }
}
