import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('location') location?: string,
    @Query('defectType') defectType?: string,
    @Query('isDefective') isDefective?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.inspectionsService.findAll({
      page: +page,
      limit: +limit,
      location,
      defectType,
      isDefective: isDefective === undefined ? undefined : isDefective === 'true',
      from,
      to,
    });
  }

  @Post(':id/incorrect')
  markAsIncorrect(@Param('id') id: string) {
    return this.inspectionsService.markAsIncorrect(id);
  }

  @Get('stats')
  getStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.inspectionsService.getStats(from, to);
  }
}
