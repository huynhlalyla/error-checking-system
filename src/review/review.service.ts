import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Image, ImageDocument } from '../images/schemas/image.schema';
import { DefectTypesService } from '../defect-types/defect-types.service';
import { AiModel } from '../ai-model/schemas/ai-model.schema';
import { QUEUE_TRAINING, JOB_TRAINING } from '../queue/queue.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    @InjectModel(AiModel.name) private aiModelModel: Model<any>,
    @InjectQueue(QUEUE_TRAINING) private trainingQueue: Queue,
    private defectTypesService: DefectTypesService,
    private configService: ConfigService,
  ) {}

  async approve(imageId: string, defectTypeCode: string | null, reviewerId: string): Promise<ImageDocument> {
    const image = await this.imageModel.findById(imageId);
    if (!image) throw new NotFoundException('Image not found');
    if (image.status !== 'pending') throw new BadRequestException('Image already reviewed');

    let defectTypeId: any = null;
    if (defectTypeCode) {
      const defectType = await this.defectTypesService.findByCode(defectTypeCode);
      if (!defectType) throw new NotFoundException(`Defect type "${defectTypeCode}" not found`);
      defectTypeId = defectType._id;
      await this.defectTypesService.addSampleFromReview(defectType._id.toString(), image.filePath, image.uploadedBy);

      // Kiểm tra ngưỡng training
      const threshold = this.configService.get<number>('TRAINING_THRESHOLD') ?? 20;
      const updated = await this.defectTypesService.findById(defectType._id.toString());
      if (updated.sampleCount >= threshold && updated.sampleCount % threshold === 0) {
        await this.triggerTraining();
      }
    }

    const updated = await this.imageModel.findByIdAndUpdate(
      imageId,
      {
        status: 'approved',
        reviewedLabel: defectTypeId,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
      { new: true },
    ).populate('reviewedLabel reviewedBy');

    return updated!;
  }

  async reject(imageId: string, reviewerId: string, note?: string): Promise<ImageDocument> {
    const image = await this.imageModel.findById(imageId);
    if (!image) throw new NotFoundException('Image not found');
    if (image.status !== 'pending') throw new BadRequestException('Image already reviewed');

    const updated = await this.imageModel.findByIdAndUpdate(
      imageId,
      { status: 'rejected', reviewedBy: reviewerId, reviewedAt: new Date(), note },
      { new: true },
    );
    return updated!;
  }

  private async triggerTraining(): Promise<void> {
    const activeDefects = await this.defectTypesService.findAll(true);
    const defectTypeIds = activeDefects.map((d) => d._id.toString());

    const version = `v${Date.now()}`;
    const newModel = await this.aiModelModel.create({
      version,
      status: 'training',
      defectTypes: defectTypeIds,
      trainStartedAt: new Date(),
    });

    await this.trainingQueue.add(JOB_TRAINING, {
      modelId: newModel._id.toString(),
      defectTypeIds,
    });
  }
}
