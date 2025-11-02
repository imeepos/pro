import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/rabbitmq";
import { WeiboAjaxStatusesCommentAst, WeiboAjaxStatusesCommentAstVisitor } from "./WeiboAjaxStatusesCommentAst";
import { WeiboAccountService } from "../services/weibo-account.service";
import { WeiboAccountInitService } from "../services/weibo-account-init.service";

async function test() {
    root.set([
        WeiboAccountService,
        WeiboAccountInitService,
        WeiboAjaxStatusesCommentAstVisitor
    ]);

    registerMqQueues();
    await root.init();

    const visitor = root.get(WeiboAjaxStatusesCommentAstVisitor);

    const ast = new WeiboAjaxStatusesCommentAst();
    ast.mid = `5227379271401937`;
    ast.uid = `2744950651`
    console.log(`帖子ID: ${ast.mid}`);
    await visitor.visit(ast, {});

    process.exit(0);
}

test().catch(err => {
    console.error(`[测试异常]`, err);
    process.exit(1);
});
