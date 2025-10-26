import { Module, OnModuleInit } from '@nestjs/common'
import { PlaywrightAstVisitor } from './PlaywrightAstVisitor'
import { WeiboSearchUrlBuilderAstVisitor } from './WeiboSearchUrlBuilderAstVisitor'
import { ExecutorService } from './services/executor.service'
import { WeiboAccountService } from './services/weibo-account.service'
import { WeiboAccountAstVisitor } from './WeiboAccountAstVisitor'
import {
    FetchPostDetailVisitor,
    FetchCommentsVisitor,
    FetchLikesVisitor,
    SavePostDetailVisitor,
} from './workflows/post-detail.visitor'
import { AccountHealthService } from './services/account-health.service'
import { DistributedLockService } from './services/distributed-lock.service'
import { PriorityQueueService } from './services/priority-queue.service'
import { WeiboHtmlParser } from './parsers/weibo-html.parser'
import { MainSearchWorkflow } from './workflows/main-search.workflow'
import { UserBehaviorAnalyzerService } from './services/user-behavior-analyzer.service'
import { BotDetectorService } from './services/bot-detector.service'
import { SpamDetectorService } from './services/spam-detector.service'
import { UserProfileVisitor } from './visitors/user-profile.visitor'
import { UserProfileWorkflow } from './workflows/user-profile.workflow'

@Module({
    providers: [
        ExecutorService,
        WeiboAccountService,
        AccountHealthService,
        DistributedLockService,
        PriorityQueueService,
        WeiboHtmlParser,
        MainSearchWorkflow,
        PlaywrightAstVisitor,
        WeiboAccountAstVisitor,
        WeiboSearchUrlBuilderAstVisitor,
        FetchPostDetailVisitor,
        FetchCommentsVisitor,
        FetchLikesVisitor,
        SavePostDetailVisitor,
        UserBehaviorAnalyzerService,
        BotDetectorService,
        SpamDetectorService,
        UserProfileVisitor,
        UserProfileWorkflow,
    ],
    exports: [
        ExecutorService,
        WeiboAccountService,
        AccountHealthService,
        DistributedLockService,
        PriorityQueueService,
        WeiboHtmlParser,
        MainSearchWorkflow,
        UserProfileWorkflow,
    ]
})
export class WorkflowModule implements OnModuleInit {
    onModuleInit() {}
}