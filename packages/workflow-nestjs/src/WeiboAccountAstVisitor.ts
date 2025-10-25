import { Injectable } from "@nestjs/common";
import { Handler, Visitor, WeiboAccountAst } from "@pro/workflow";
import { WeiboAccountService } from "./services/weibo-account.service";


@Handler(WeiboAccountAst)
@Injectable()
export class WeiboAccountAstVisitor {
    constructor(private weiboAccountService: WeiboAccountService) { }
    async visit(ast: WeiboAccountAst, _ctx: Visitor) {
        const request: { headers: Record<string, string> } = { headers: {} };
        const selection = await this.weiboAccountService.injectCookies(request);
        ast.cookies = request.headers?.Cookie || '';
        ast.headers = request.headers;
        ast.userAgent = request.headers?.['User-Agent'] || request.headers?.['user-agent'] || '';
        ast.selectedAccountId = selection?.id!;
        ast.state = 'success';
        return ast;
    }
}