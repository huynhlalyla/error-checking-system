import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SamplesService } from './samples.service';
import { CreateSampleDto, UpdateSampleDto } from './dto/sample.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('samples')
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  @Get()
  findAll(@Query('active') active?: string) {
    return this.samplesService.findAll(active === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.samplesService.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateSampleDto) {
    return this.samplesService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSampleDto) {
    return this.samplesService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.samplesService.remove(id);
  }

  // --- SAMPLES IMAGES ---
  @Get(':code/images')
  getSamples(@Param('code') code: string) {
    return this.samplesService.getSamples(code);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':code/images')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|bmp|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed'), false);
      }
      cb(null, true);
    }
  }))
  async uploadSample(
    @Param('code') code: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.samplesService.uploadSample(code, file, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':code/images/:filename')
  deleteSample(
    @Param('code') code: string,
    @Param('filename') filename: string,
  ) {
    return this.samplesService.deleteSample(code, filename);
  }
}
