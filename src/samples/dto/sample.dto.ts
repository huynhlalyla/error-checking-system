import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSampleDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['PRODUCT', 'DEFECT'])
  type: string;

  @IsMongoId()
  @IsOptional()
  targetProductId?: string;
}

export class UpdateSampleDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['PRODUCT', 'DEFECT'])
  @IsOptional()
  type?: string;

  @IsMongoId()
  @IsOptional()
  targetProductId?: string;

  @IsOptional()
  isActive?: boolean;
}
