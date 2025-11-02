import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/rabbitmq";
import { WeiboAjaxFriendshipsAst, WeiboAjaxFriendshipsAstVisitor } from "./WeiboAjaxFriendshipsAst";
import { WeiboAccountService } from "../services/weibo-account.service";
import { WeiboAccountInitService } from "../services/weibo-account-init.service";

async function test() {
    root.set([
        WeiboAccountService,
        WeiboAccountInitService,
        WeiboAjaxFriendshipsAstVisitor
    ]);

    registerMqQueues();
    await root.init();

    const visitor = root.get(WeiboAjaxFriendshipsAstVisitor);

    const ast = new WeiboAjaxFriendshipsAst();
    ast.uid = `2342846727`;
    ast.page = 1;

    console.log(`验证用户 ${ast.uid} 的 Cookie 有效性...`);
    await visitor.visit(ast, {});

    console.log(`Cookie 验证结果: ${ast.state === 'success' ? '有效' : '无效'}`);

    process.exit(0);
}

test().catch(err => {
    console.error(`[测试异常]`, err);
    process.exit(1);
});
