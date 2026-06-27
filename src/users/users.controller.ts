import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    const { passwordHash, ...result } = (user as any).toObject();
    return result;
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Put(':id/freeze')
  toggleFreeze(@Param('id') id: string) {
    return this.usersService.toggleFreeze(id);
  }

  @Put(':id/extend')
  extendExpiration(@Param('id') id: string, @Body() body: { expiresAt: string | null }) {
    const date = body.expiresAt ? new Date(body.expiresAt) : null;
    return this.usersService.extendExpiration(id, date);
  }
}
