import { Inject, Injectable } from "@pro/core";
import { Handler, Visitor, WeiboAccountAst, NoRetryError } from "@pro/workflow-core";
import { WeiboAccountService } from "./services/weibo-account.service";

@Injectable()
export class WeiboAccountAstVisitor {
    constructor(@Inject(WeiboAccountService) private weiboAccountService: WeiboAccountService) { }
    @Handler(WeiboAccountAst)
    async visit(ast: WeiboAccountAst, _ctx: Visitor) {
        const request: { headers: Record<string, string> } = { headers: {} };
        const selection = await this.weiboAccountService.injectCookies(request);

        if (!selection) {
            ast.state = 'fail';
            throw new NoRetryError('无可用微博账号：所有账号均不可用或健康度过低');
        }

        ast.cookies = request.headers?.Cookie || '';
        ast.headers = request.headers;
        ast.userAgent = request.headers?.['User-Agent'] || request.headers?.['user-agent'] || '';
        ast.selectedAccountId = selection.id;
        ast.state = 'success';
        return ast;
    }
}