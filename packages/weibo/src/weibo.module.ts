import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'

import { WeiboStatusService } from './weibo.service.js'

@Module({
  imports: [HttpModule],
  providers: [WeiboStatusService],
  exports: [WeiboStatusService]
})
export class WeiboModule {}
