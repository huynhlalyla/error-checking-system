import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Image, ImageDocument } from './schemas/image.schema';
import { QUEUE_INFERENCE, JOB_INFERENCE } from '../queue/queue.constants';
import { EventsGateway } from '../gateway/events.gateway';

@Injectable()
export class ImagesService {
  constructor(
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
    @InjectQueue(QUEUE_INFERENCE) private inferenceQueue: Queue,
    private eventsGateway: EventsGateway,
  ) {}

  async uploadFromDevice(
    file: Express.Multer.File,
    user: any,
    productId: string,
    location: string,
  ): Promise<ImageDocument> {
    const image = await this.imageModel.create({
      filePath: file.path,
      source: 'aoi_machine',
      uploadedBy: user._id,
      status: 'pending',
      productId,
      location,
    });

    this.eventsGateway.emitImageProcessing(image);

    await this.inferenceQueue.add(JOB_INFERENCE, {
      imageId: image._id.toString(),
      filePath: file.path,
      productId,
      location,
    });

    return image;
  }

  async uploadFromInspector(
    file: Express.Multer.File,
    user: any,
    productId: string,
    location: string,
  ): Promise<ImageDocument> {
    const image = await this.imageModel.create({
      filePath: file.path,
      source: 'inspector',
      uploadedBy: user._id,
      status: 'pending',
      productId,
      location,
    });

    this.eventsGateway.emitImageProcessing(image);

    await this.inferenceQueue.add(JOB_INFERENCE, {
      imageId: image._id.toString(),
      filePath: file.path,
      productId,
      location,
    });

    return image;
  }

  async findAll(options: { status?: string; page: number; limit: number }) {
    const filter: any = {};
    if (options.status) filter.status = options.status;

    const skip = (options.page - 1) * options.limit;
    const [data, total] = await Promise.all([
      this.imageModel
        .find(filter)
        .populate('uploadedBy', 'username role')
        .populate('predictedLabel', 'code name severity')
        .populate('reviewedLabel', 'code name severity')
        .populate('reviewedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.imageModel.countDocuments(filter),
    ]);

    return { data, total, page: options.page, limit: options.limit };
  }

  async findById(id: string): Promise<ImageDocument> {
    const image = await this.imageModel
      .findById(id)
      .populate('uploadedBy', 'username role')
      .populate('predictedLabel reviewedLabel reviewedBy');
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  async updatePrediction(
    imageId: string,
    predictedLabel: string | null,
    confidence: number,
    isUnknown: boolean,
  ): Promise<void> {
    await this.imageModel.findByIdAndUpdate(imageId, {
      predictedLabel,
      confidence,
      isUnknown,
    });
  }
}
