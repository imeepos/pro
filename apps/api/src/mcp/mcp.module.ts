import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpController } from './mcp.controller';
import { GraphqlExecutorModule } from './graphql-executor.module';

@Module({
  imports: [
    ConfigModule,
    GraphqlExecutorModule,
  ],
  controllers: [McpController],
})
export class McpModule {}
