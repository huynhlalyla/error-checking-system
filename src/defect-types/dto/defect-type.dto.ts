import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateDefectTypeDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code must be uppercase letters, numbers or underscore' })
  code: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: string;
}

export class UpdateDefectTypeDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: string;

  @IsOptional()
  isActive?: boolean;
}
