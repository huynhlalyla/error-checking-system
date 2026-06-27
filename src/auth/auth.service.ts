import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<UserDocument | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;
    
    if (user.isFrozen) return null;
    if (user.expiresAt && new Date() > user.expiresAt) return null;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  async login(user: UserDocument) {
    const payload = {
      sub: (user as any)._id,
      username: user.username,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: (user as any)._id,
        username: user.username,
        role: user.role,
      },
    };
  }
}
