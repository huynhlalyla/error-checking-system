import { Injectable, ConflictException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { DefectType, DefectTypeDocument } from './schemas/defect-type.schema';
import { CreateDefectTypeDto, UpdateDefectTypeDto } from './dto/defect-type.dto';
import { AiModelService } from '../ai-model/ai-model.service';

@Injectable()
export class DefectTypesService {
  constructor(
    @InjectModel(DefectType.name) private defectTypeModel: Model<DefectTypeDocument>,
    @Inject(forwardRef(() => AiModelService)) private aiModelService: AiModelService,
  ) {}

  async create(dto: CreateDefectTypeDto): Promise<DefectTypeDocument> {
    const exists = await this.defectTypeModel.findOne({ code: dto.code.toUpperCase() });
    if (exists) throw new ConflictException(`Defect type with code "${dto.code}" already exists`);
    return this.defectTypeModel.create(dto);
  }

  async findAll(activeOnly = false): Promise<DefectTypeDocument[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.defectTypeModel.find(filter).sort({ code: 1 }).exec();
  }

  async findById(id: string): Promise<DefectTypeDocument> {
    const found = await this.defectTypeModel.findById(id);
    if (!found) throw new NotFoundException('Defect type not found');
    return found;
  }

  async findByCode(code: string): Promise<DefectTypeDocument | null> {
    return this.defectTypeModel.findOne({ code: code.toUpperCase() });
  }

  async updateLastTrainedSampleCount(id: string, count: number): Promise<void> {
    await this.defectTypeModel.findByIdAndUpdate(id, { lastTrainedSampleCount: count });
  }

  async update(id: string, dto: UpdateDefectTypeDto): Promise<DefectTypeDocument> {
    const oldDefect = await this.findById(id);
    const updated = await this.defectTypeModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Defect type not found');

    if (oldDefect.isActive !== updated.isActive) {
      await this.aiModelService.checkAutoTraining(`Trạng thái của loại lỗi ${updated.code} đã thay đổi`);
    } else if (updated.isActive) {
      const infoChanged = oldDefect.name !== updated.name || oldDefect.description !== updated.description || oldDefect.severity !== updated.severity;
      if (infoChanged) {
        await this.aiModelService.checkAutoTraining(`Thông tin của loại lỗi ${updated.code} đã thay đổi`);
      }
    }

    return updated;
  }

  async addSampleFromReview(id: string, filePath: string, uploadedBy: any): Promise<void> {
    await this.defectTypeModel.findByIdAndUpdate(id, {
      $push: { sampleImages: { filePath, uploadedBy } },
      $inc: { sampleCount: 1 }
    });
    this.aiModelService.checkAutoTraining();
  }

  async remove(id: string): Promise<void> {
    const oldDefect = await this.findById(id);
    const result = await this.defectTypeModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Defect type not found');
    
    if (oldDefect.isActive) {
      await this.aiModelService.checkAutoTraining(`Loại lỗi ${oldDefect.code} đã bị xoá`);
    }
  }

  // --- SAMPLES ---
  async getSamples(code: string): Promise<any[]> {
    const defectType = await this.defectTypeModel
      .findOne({ code: code.toUpperCase() })
      .populate('sampleImages.uploadedBy', 'username role')
      .exec();
    return defectType?.sampleImages || [];
  }

  async uploadSample(code: string, file: Express.Multer.File, user: any): Promise<{ filePath: string }> {
    const defectType = await this.findByCode(code);
    if (!defectType) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new NotFoundException('Defect type not found');
    }

    const relativePath = `uploads/${file.filename}`;

    await this.defectTypeModel.findByIdAndUpdate(defectType._id, {
      $push: { sampleImages: { filePath: relativePath, uploadedBy: user._id } },
      $inc: { sampleCount: 1 }
    });

    this.aiModelService.checkAutoTraining();

    return { filePath: relativePath };
  }

  async deleteSample(code: string, filename: string): Promise<void> {
    const defectType = await this.findByCode(code);
    if (!defectType) return;

    const relativePath = `uploads/${filename}`;
    const filePath = path.join('./', relativePath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.defectTypeModel.findByIdAndUpdate(defectType._id, {
      $pull: { sampleImages: { filePath: relativePath } },
      $inc: { sampleCount: -1 }
    });

    this.aiModelService.checkAutoTraining();
  }
}
