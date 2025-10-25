import { Module, OnModuleInit } from '@nestjs/common'
import { PlaywrightAstVisitor } from './PlaywrightAstVisitor'
import { WeiboSearchUrlBuilderAstVisitor } from './WeiboSearchUrlBuilderAstVisitor'
import { ExecutorService } from './services/executor.service'
import { WeiboAccountService } from './services/weibo-account.service'
import { WeiboAccountAstVisitor } from './WeiboAccountAstVisitor'

@Module({
    providers: [
        // service
        ExecutorService,
        WeiboAccountService,
        // visitor
        PlaywrightAstVisitor,
        WeiboAccountAstVisitor,
        WeiboSearchUrlBuilderAstVisitor,
    ]
})
export class WorkflowModule implements OnModuleInit {
    onModuleInit() {}
}