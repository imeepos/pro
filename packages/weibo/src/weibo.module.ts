import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { root } from '@pro/core'
import { RawDataSourceService } from '@pro/mongodb'

import { WeiboStatusService } from './weibo.service.js'
import { WeiboProfileService } from './weibo-profile.service.js'
import { WeiboHealthCheckService } from './weibo-health-check.service.js'

@Module({
  imports: [HttpModule],
  providers: [
    {
      provide: RawDataSourceService,
      useFactory: () => root.get(RawDataSourceService)
    },
    WeiboStatusService,
    WeiboProfileService,
    WeiboHealthCheckService
  ],
  exports: [WeiboStatusService, WeiboProfileService, WeiboHealthCheckService]
})
export class WeiboModule {}
