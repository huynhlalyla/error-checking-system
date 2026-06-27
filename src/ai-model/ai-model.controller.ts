import {
  Controller, Get, Post, Body, Query, UseGuards, Param, Delete, UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiModelService } from './ai-model.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InternalKeyGuard } from '../auth/guards/internal-key.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { IsNumber, IsString } from 'class-validator';

class TrainingCompleteDto {
  @IsString()
  modelId: string;
  @IsNumber()
  accuracy: number;
  @IsNumber()
  trainedOn: number;
}

class TrainingFailedDto {
  @IsString()
  modelId: string;
  @IsString()
  reason: string;
}

@Controller('ai-model')
export class AiModelController {
  constructor(private readonly aiModelService: AiModelService) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  getCurrent() {
    return this.aiModelService.getCurrent();
  }

  @UseGuards(ApiKeyGuard)
  @Post('predict')
  @UseInterceptors(FileInterceptor('image'))
  async predict(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng upload ảnh (image)');
    }
    return this.aiModelService.predict(file.buffer, file.originalname);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getHistory(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.aiModelService.getHistory(+page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('trigger-training')
  triggerTraining() {
    return this.aiModelService.triggerManualTraining();
  }

  @UseGuards(JwtAuthGuard)
  @Get('progress')
  getProgress() {
    return this.aiModelService.getTrainingProgress();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/cancel')
  cancelTraining(@Param('id') id: string) {
    return this.aiModelService.cancelTraining(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  deleteModel(@Param('id') id: string) {
    return this.aiModelService.deleteModel(id);
  }

  @UseGuards(InternalKeyGuard)
  @Get('dataset')
  getDataset() {
    return this.aiModelService.getTrainingDataset();
  }

  @UseGuards(InternalKeyGuard)
  @Post('training-complete')
  trainingComplete(@Body() dto: TrainingCompleteDto) {
    return this.aiModelService.onTrainingComplete(dto.modelId, dto.accuracy, dto.trainedOn);
  }

  @UseGuards(InternalKeyGuard)
  @Post('training-failed')
  trainingFailed(@Body() dto: TrainingFailedDto) {
    return this.aiModelService.onTrainingFailed(dto.modelId, dto.reason);
  }
}
