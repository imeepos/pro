import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { EventsModule } from '../events/events.module';
import { McpController } from './mcp.controller';
import { GraphqlExecutorService } from './services/graphql-executor.service';
import { McpAuthService } from './services/auth.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UserModule,
    EventsModule,
  ],
  controllers: [McpController],
  providers: [
    GraphqlExecutorService,
    McpAuthService,
  ],
})
export class McpModule {}
