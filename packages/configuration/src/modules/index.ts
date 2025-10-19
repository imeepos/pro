import { Module, Global } from '@nestjs/common';
import { ConfigurationService } from '../configuration.service';

@Global()
@Module({
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}