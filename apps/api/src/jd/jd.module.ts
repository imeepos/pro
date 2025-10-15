import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JdAccountEntity } from '@pro/entities';
import { JdAccountService } from './jd-account.service';
import { JdAuthService } from './jd-auth.service';
import { JdHealthCheckService } from './jd-health-check.service';
import { JdAccountResolver } from './jd-account.resolver';
import { JdAuthResolver } from './jd-auth.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([JdAccountEntity]),
    HttpModule,
  ],
  controllers: [],
  providers: [
    JdAccountService,
    JdAuthService,
    JdHealthCheckService,
    JdAccountResolver,
    JdAuthResolver,
  ],
  exports: [
    JdAccountService,
    JdAuthService,
    JdHealthCheckService,
  ],
})
export class JdModule {}
