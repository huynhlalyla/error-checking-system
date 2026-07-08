import {
  Controller, Post, Get, Query, Param, Body,
  UseInterceptors, UploadedFile, UseGuards, Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

const storage = diskStorage({
  destination: './uploads',
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

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  /** AOI machine hoặc inspector upload ảnh */
  @UseGuards(ApiKeyGuard)
  @Post('upload/device')
  @UseInterceptors(FileInterceptor('image', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadFromDevice(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Body('productId') productIdBody: string,
    @Body('location') locationBody: string,
    @Query('productId') productIdQuery: string,
    @Query('location') locationQuery: string,
    @Query('productionLine') productionLine: string,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const productId = productIdBody || productIdQuery;
    const location = locationBody || locationQuery || productionLine;
    return this.imagesService.uploadFromDevice(file, req.user, productId, location);
  }

  /** Nhân viên upload ảnh qua JWT */
  @UseGuards(JwtAuthGuard)
  @Post('upload/inspector')
  @UseInterceptors(FileInterceptor('image', { storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadFromInspector(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Body('productId') productIdBody: string,
    @Body('location') locationBody: string,
    @Query('productId') productIdQuery: string,
    @Query('location') locationQuery: string,
    @Query('productionLine') productionLine: string,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const productId = productIdBody || productIdQuery;
    const location = locationBody || locationQuery || productionLine;
    return this.imagesService.uploadFromInspector(file, req.user, productId, location);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('status') status?: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.imagesService.findAll({ status, page: +page, limit: +limit });
  }

  @UseGuards(JwtAuthGuard)
  @Get('pending')
  findPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.imagesService.findAll({ status: 'pending', page: +page, limit: +limit });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.imagesService.findById(id);
  }
}
