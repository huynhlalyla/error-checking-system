import {
  Controller, Get, Put, Param, Query, UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('unread') unread?: string,
  ) {
    return this.alertsService.findAll(+page, +limit, unread === 'true');
  }

  @Put(':id/read')
  markRead(@Param('id') id: string) {
    return this.alertsService.markRead(id);
  }

  @Put('read-all')
  markAllRead() {
    return this.alertsService.markAllRead();
  }
}
