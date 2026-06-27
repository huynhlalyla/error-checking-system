import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.isFrozen) {
      throw new UnauthorizedException('Account is frozen or deleted');
    }
    if (user.expiresAt && new Date() > user.expiresAt) {
      // Auto-freeze conceptually, or just block
      throw new UnauthorizedException('Account has expired');
    }
    return { _id: user._id, username: user.username, role: user.role };
  }
}
