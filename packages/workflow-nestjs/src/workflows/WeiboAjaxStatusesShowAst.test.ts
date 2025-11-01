import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/rabbitmq";
import { WeiboAjaxStatusesShowAst, WeiboAjaxStatusesShowAstVisitor } from "./WeiboAjaxStatusesShowAst";
import { WeiboAccountService } from "../services/weibo-account.service";
import { WeiboAccountInitService } from "../services/weibo-account-init.service";

async function test() {
    root.set([
        WeiboAccountService,
        WeiboAccountInitService,
        WeiboAjaxStatusesShowAstVisitor
    ]);

    registerMqQueues();
    await root.init();

    const visitor = root.get(WeiboAjaxStatusesShowAstVisitor);

    const ast = new WeiboAjaxStatusesShowAst();
    ast.mblogid = "Qbug75SHT";

    console.log(`帖子ID: ${ast.mblogid}`);

    const state = await visitor.visit(ast, {});
    console.log(`爬取结果`, state)
    process.exit(0);
}

test().catch(err => {
    console.error(`[测试异常]`, err);
    process.exit(1);
});
