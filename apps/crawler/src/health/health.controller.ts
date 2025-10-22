import { Controller, Get } from '@nestjs/common';
import { BrowserGuardianService } from '../services/browser-guardian.service';

@Controller('health')
export class HealthController {
  constructor(private readonly browserGuardian: BrowserGuardianService) {}

  @Get('rendering')
  async rendering() {
    const snapshot = await this.browserGuardian.health();

    return {
      status: snapshot.ok ? 'ok' : 'error',
      enabled: snapshot.enabled,
      finalUrl: snapshot.finalUrl ?? null,
      error: snapshot.error ?? null,
    };
  }
}
