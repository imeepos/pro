import { Global, Module } from '@nestjs/common';
import { ConnectionMetricsService } from './connection-metrics.service';

@Global()
@Module({
  providers: [ConnectionMetricsService],
  exports: [ConnectionMetricsService],
})
export class MonitoringModule {}
