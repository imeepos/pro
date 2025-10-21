import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { MongodbModule } from '@pro/mongodb'

import { WeiboStatusService } from './weibo.service.js'

@Module({
  imports: [HttpModule, MongodbModule.forFeature()],
  providers: [WeiboStatusService],
  exports: [WeiboStatusService]
})
export class WeiboModule {}
