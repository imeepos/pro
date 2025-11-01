import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/rabbitmq";
import { WeiboAjaxStatusesLikeShowAst, WeiboAjaxStatusesLikeShowAstVisitor } from "./WeiboAjaxStatusesLikeShowAst";
import { WeiboAccountService } from "../services/weibo-account.service";
import { WeiboAccountInitService } from "../services/weibo-account-init.service";

async function test() {
    root.set([
        WeiboAccountService,
        WeiboAccountInitService,
        WeiboAjaxStatusesLikeShowAstVisitor
    ]);

    registerMqQueues();
    await root.init();

    const visitor = root.get(WeiboAjaxStatusesLikeShowAstVisitor);

    const ast = new WeiboAjaxStatusesLikeShowAst();
    ast.mid = "5227379271401937";
    ast.page = 1;

    console.log(`[测试] 获取微博点赞列表 - 帖子ID: ${ast.mid}`);

    await visitor.handler(ast, {});

    process.exit(0);
}

test().catch(err => {
    console.error(`[测试异常]`, err);
    process.exit(1);
});
