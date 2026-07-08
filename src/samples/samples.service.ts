import { Injectable, ConflictException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Sample, SampleDocument } from './schemas/sample.schema';
import { CreateSampleDto, UpdateSampleDto } from './dto/sample.dto';
import { AiModelService } from '../ai-model/ai-model.service';

@Injectable()
export class SamplesService {
  constructor(
    @InjectModel(Sample.name) private sampleModel: Model<SampleDocument>,
    @Inject(forwardRef(() => AiModelService)) private aiModelService: AiModelService,
  ) {}

  async generateCode(type: string): Promise<string> {
    const prefix = type === 'PRODUCT' ? 'TP' : 'L';
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    
    const latestSample = await this.sampleModel
      .find({ code: regex })
      .sort({ createdAt: -1 })
      .limit(1)
      .exec();

    let nextNumber = 1;
    if (latestSample.length > 0) {
      const match = latestSample[0].code.match(regex);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  async create(dto: CreateSampleDto): Promise<SampleDocument> {
    const code = await this.generateCode(dto.type);
    
    if (dto.type === 'DEFECT' && !dto.targetProductId) {
      // It's allowed by dto, but we can ensure it's handled if provided
    }

    const payload = {
      ...dto,
      code
    };

    return this.sampleModel.create(payload);
  }

  async findAll(activeOnly = false): Promise<SampleDocument[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.sampleModel.find(filter).populate('targetProductId', 'code name').sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<SampleDocument> {
    const found = await this.sampleModel.findById(id).populate('targetProductId', 'code name');
    if (!found) throw new NotFoundException('Sample not found');
    return found;
  }

  async findByCode(code: string): Promise<SampleDocument | null> {
    return this.sampleModel.findOne({ code: code.toUpperCase() }).populate('targetProductId', 'code name');
  }

  async updateLastTrainedSampleCount(id: string, count: number): Promise<void> {
    await this.sampleModel.findByIdAndUpdate(id, { lastTrainedSampleCount: count });
  }

  async update(id: string, dto: UpdateSampleDto): Promise<SampleDocument> {
    const oldSample = await this.findById(id);
    const updated = await this.sampleModel.findByIdAndUpdate(id, dto, { new: true }).populate('targetProductId', 'code name');
    if (!updated) throw new NotFoundException('Sample not found');

    if (oldSample.isActive !== updated.isActive) {
      await this.aiModelService.checkAutoTraining(`Trạng thái của mẫu vật ${updated.code} đã thay đổi`);
    } else if (updated.isActive) {
      const infoChanged = oldSample.name !== updated.name || oldSample.description !== updated.description || oldSample.type !== updated.type;
      if (infoChanged) {
        await this.aiModelService.checkAutoTraining(`Thông tin của mẫu vật ${updated.code} đã thay đổi`);
      }
    }

    return updated;
  }

  async addSampleFromReview(id: string, filePath: string, uploadedBy: any): Promise<void> {
    await this.sampleModel.findByIdAndUpdate(id, {
      $push: { sampleImages: { filePath, uploadedBy } },
      $inc: { sampleCount: 1 }
    });
    this.aiModelService.checkAutoTraining();
  }

  async remove(id: string): Promise<void> {
    const oldSample = await this.findById(id);
    const result = await this.sampleModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Sample not found');
    
    if (oldSample.isActive) {
      await this.aiModelService.checkAutoTraining(`Mẫu vật ${oldSample.code} đã bị xoá`);
    }
  }

  // --- IMAGES ---
  async getSamples(code: string): Promise<any[]> {
    const sampleDoc = await this.sampleModel
      .findOne({ code: code.toUpperCase() })
      .populate('sampleImages.uploadedBy', 'username role')
      .exec();
    return sampleDoc?.sampleImages || [];
  }

  async uploadSample(code: string, file: Express.Multer.File, user: any): Promise<{ filePath: string }> {
    const sampleDoc = await this.findByCode(code);
    if (!sampleDoc) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new NotFoundException('Sample not found');
    }

    const relativePath = `uploads/${file.filename}`;

    await this.sampleModel.findByIdAndUpdate(sampleDoc._id, {
      $push: { sampleImages: { filePath: relativePath, uploadedBy: user._id } },
      $inc: { sampleCount: 1 }
    });

    this.aiModelService.checkAutoTraining();

    return { filePath: relativePath };
  }

  async deleteSample(code: string, filename: string): Promise<void> {
    const sampleDoc = await this.findByCode(code);
    if (!sampleDoc) return;

    const relativePath = `uploads/${filename}`;
    const filePath = path.join('./', relativePath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.sampleModel.findByIdAndUpdate(sampleDoc._id, {
      $pull: { sampleImages: { filePath: relativePath } },
      $inc: { sampleCount: -1 }
    });

    this.aiModelService.checkAutoTraining();
  }
}
