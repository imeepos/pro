import { Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigResolver } from './config.resolver';

@Module({
  controllers: [],
  providers: [ConfigService, ConfigResolver],
  exports: [ConfigService],
})
export class ConfigModule {}
