import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('应用')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: '获取应用信息' })
  getAppInfo() {
    return {
      name: 'Bug守护者',
      description: '企业级Bug追踪管理系统',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}