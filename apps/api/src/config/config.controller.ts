import {
  Controller,
  Get,
  Query,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import { GetConfigDto, ConfigType, ConfigResponseDto } from './dto/config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('config')
@UseGuards(JwtAuthGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getConfig(@Query() getConfigDto: GetConfigDto): Promise<ConfigResponseDto> {
    return this.configService.getConfig(getConfigDto);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCache(@Query('type') type?: ConfigType): Promise<void> {
    this.configService.clearCache(type);
  }

  @Get('cache/stats')
  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    return this.configService.getCacheStats();
  }
}