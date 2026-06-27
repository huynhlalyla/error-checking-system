import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) throw new UnauthorizedException('API key missing');

    const user = await this.usersService.findByApiKey(apiKey);
    if (!user) throw new UnauthorizedException('Invalid API key');

    if (user.isFrozen) {
      throw new UnauthorizedException('API key is frozen');
    }
    if (user.expiresAt && new Date() > user.expiresAt) {
      throw new UnauthorizedException('API key has expired');
    }

    request.user = user;
    return true;
  }
}
