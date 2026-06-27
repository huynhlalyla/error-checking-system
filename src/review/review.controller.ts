import {
  Controller, Post, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IsOptional, IsString } from 'class-validator';

class ApproveDto {
  @IsString()
  @IsOptional()
  defectTypeCode?: string | null;
}

class RejectDto {
  @IsString()
  @IsOptional()
  note?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveDto,
    @Request() req: any,
  ) {
    return this.reviewService.approve(id, dto.defectTypeCode ?? null, req.user._id);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @Request() req: any,
  ) {
    return this.reviewService.reject(id, req.user._id, dto.note);
  }
}
