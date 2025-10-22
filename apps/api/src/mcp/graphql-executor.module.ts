import { Global, Module } from '@nestjs/common';
import { LoadersModule } from '../loaders.module';
import { GraphqlExecutorService } from './services/graphql-executor.service';
import { McpAuthService } from './services/auth.service';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [LoadersModule, AuthModule],
  providers: [GraphqlExecutorService, McpAuthService],
  exports: [GraphqlExecutorService, McpAuthService],
})
export class GraphqlExecutorModule {}
