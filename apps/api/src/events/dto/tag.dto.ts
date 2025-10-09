import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MaxLength(50)
  tagName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'tagColor must be a valid hex color (e.g., #1890ff)',
  })
  tagColor?: string;
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tagName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'tagColor must be a valid hex color (e.g., #1890ff)',
  })
  tagColor?: string;
}
