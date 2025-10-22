import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DlqManagerService } from '@pro/rabbitmq';
import { DlqResolver } from './dlq.resolver';

@Module({
  imports: [ConfigModule],
  providers: [
    DlqResolver,
    {
      provide: DlqManagerService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('RABBITMQ_URL');
        if (!url) {
          throw new Error('RABBITMQ_URL 未配置，无法初始化死信队列管理能力');
        }

        return new DlqManagerService({
          url,
          maxRetries: 3,
          enableDLQ: true,
        });
      },
    },
  ],
  exports: [DlqManagerService],
})
export class DlqModule {}
