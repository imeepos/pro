import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/workflow-core";
import { WeiboAjaxStatusesMymblogAst, WeiboAjaxStatusesMymblogAstVisitor } from "./WeiboAjaxStatusesMymblogAst";
import { WeiboAccountService } from "../services/weibo-account.service";
import { WeiboAccountInitService } from "../services/weibo-account-init.service";

async function test() {
    root.set([
        WeiboAccountService,
        WeiboAccountInitService,
        WeiboAjaxStatusesMymblogAstVisitor
    ]);

    registerMqQueues();
    await root.init();

    const visitor = root.get(WeiboAjaxStatusesMymblogAstVisitor);

    const ast = new WeiboAjaxStatusesMymblogAst();
    ast.uid = `2744950651`
    console.log(`用户: ${ast.uid}`);
    await visitor.visit(ast, {});

    process.exit(0);
}

test().catch(err => {
    console.error(`[测试异常]`, err);
    process.exit(1);
});
