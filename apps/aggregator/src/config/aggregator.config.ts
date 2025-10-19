import { ConfigService } from '@nestjs/config';

export interface AggregatorConfig {
  hourlyWindowSize: number;
  dailyRollupHour: number;
  windowUpdateInterval: number;
  cacheTtl: {
    hourly: number;
    daily: number;
    realtime: number;
  };
}

export const createAggregatorConfig = (
  configService: ConfigService,
): AggregatorConfig => {
  return {
    hourlyWindowSize: configService.get('HOURLY_WINDOW_SIZE', 60),
    dailyRollupHour: configService.get('DAILY_ROLLUP_HOUR', 3),
    windowUpdateInterval: configService.get('WINDOW_UPDATE_INTERVAL', 300000),
    cacheTtl: {
      hourly: configService.get('CACHE_TTL_HOURLY', 86400),
      daily: configService.get('CACHE_TTL_DAILY', 604800),
      realtime: configService.get('CACHE_TTL_REALTIME', 300),
    },
  };
};
