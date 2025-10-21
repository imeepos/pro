import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { MongodbModule } from '@pro/mongodb'

import { WeiboStatusService } from './weibo.service.js'
import { WeiboProfileService } from './weibo-profile.service.js'

@Module({
  imports: [HttpModule, MongodbModule.forFeature()],
  providers: [WeiboStatusService, WeiboProfileService],
  exports: [WeiboStatusService, WeiboProfileService]
})
export class WeiboModule {}
