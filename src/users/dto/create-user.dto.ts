import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Role } from '../../common/decorators/roles.decorator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsEnum(['admin', 'inspector', 'device'])
  @IsOptional()
  role?: Role;

  @IsOptional()
  expiresAt?: Date | string | null;
}
