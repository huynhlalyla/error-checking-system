import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DefectTypesService } from './defect-types.service';
import { CreateDefectTypeDto, UpdateDefectTypeDto } from './dto/defect-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const storage = diskStorage({
  destination: './uploads/defect-samples',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|bmp|webp)$/)) {
    return cb(new BadRequestException('Only image files are allowed'), false);
  }
  cb(null, true);
};

@UseGuards(JwtAuthGuard)
@Controller('defect-types')
export class DefectTypesController {
  constructor(private readonly defectTypesService: DefectTypesService) {}

  @Get()
  findAll(@Query('active') active?: string) {
    return this.defectTypesService.findAll(active === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.defectTypesService.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateDefectTypeDto) {
    return this.defectTypesService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDefectTypeDto) {
    return this.defectTypesService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.defectTypesService.remove(id);
  }

  // --- SAMPLES ---
  @Get(':code/samples')
  getSamples(@Param('code') code: string) {
    return this.defectTypesService.getSamples(code);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':code/samples')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    })
  }))
  async uploadSample(
    @Param('code') code: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.defectTypesService.uploadSample(code, file, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':code/samples/:filename')
  deleteSample(
    @Param('code') code: string,
    @Param('filename') filename: string,
  ) {
    return this.defectTypesService.deleteSample(code, filename);
  }
}
