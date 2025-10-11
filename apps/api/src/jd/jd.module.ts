import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JdAccountEntity } from '@pro/entities';
import { JdAccountService } from './jd-account.service';
import { JdAuthService } from './jd-auth.service';
import { JdHealthCheckService } from './jd-health-check.service';
import { JdController } from './jd.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([JdAccountEntity]),
    HttpModule,
  ],
  controllers: [JdController],
  providers: [
    JdAccountService,
    JdAuthService,
    JdHealthCheckService,
  ],
  exports: [
    JdAccountService,
    JdAuthService,
    JdHealthCheckService,
  ],
})
export class JdModule {}