import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/rabbitmq";
import { WeiboAjaxFeedHotTimelineAst, WeiboAjaxFeedHotTimelineAstVisitor } from "./WeiboAjaxFeedHotTimelineAst";
import { WeiboAccountService } from "../services/weibo-account.service";
import { WeiboAccountInitService } from "../services/weibo-account-init.service";

async function test() {
    root.set([
        WeiboAccountService,
        WeiboAccountInitService,
        WeiboAjaxFeedHotTimelineAstVisitor
    ]);

    registerMqQueues();
    await root.init();

    const visitor = root.get(WeiboAjaxFeedHotTimelineAstVisitor);

    const ast = new WeiboAjaxFeedHotTimelineAst();
    ast.group_id = '102803600343';
    ast.containerid = '102803_ctg1_600343_-_ctg1_600343';
    ast.extparam = 'discover|new_feed';
    ast.count = 10;

    console.log(`开始爬取微博热门时间线...`);
    console.log(`分组ID: ${ast.group_id}`);
    console.log(`容器ID: ${ast.containerid}`);
    console.log(`每页数量: ${ast.count}`);

    await visitor.visit(ast, {});

    console.log(`爬取完成，最终状态: ${ast.state}`);

    process.exit(0);
}

test().catch(err => {
    console.error(`[测试异常]`, err);
    process.exit(1);
});
