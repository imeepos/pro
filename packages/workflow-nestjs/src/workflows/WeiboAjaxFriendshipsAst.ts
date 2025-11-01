import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input } from "@pro/workflow-core";
import { WeiboAccountService } from "../services/weibo-account.service";

export interface WeiboAjaxFriendshipsResponse {
    ok: number;
    data: any;
}

export class WeiboAjaxFriendshipsAst extends Ast {

    @Input()
    uid: string;

    @Input()
    page?: number = 1;
}

@Injectable()
export class WeiboAjaxFriendshipsAstVisitor {

    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }

    @Handler(WeiboAjaxFriendshipsAst)
    async visit(ast: WeiboAjaxFriendshipsAst, _ctx: any) {
        const selection = await this.account.selectBestAccount();
        if (!selection) {
            ast.state = 'fail';
            console.error(`[WeiboAjaxFriendshipsAstVisitor] 没有可用账号`);
            return ast;
        }

        const cookies = selection.cookieHeader.split(';').map(it => it.split('=').map(it => it.trim()));
        const token = cookies.map(([name, value]) => {
            return { name, value }
        }).find((it) => {
            return it.name === `XSRF-TOKEN`
        });

        const url = `https://weibo.com/ajax/friendships/friends?page=${ast.page || 1}&uid=${ast.uid}`;
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'client-version': 'v2.47.130',
                'priority': 'u=1, i',
                'referer': `https://weibo.com/u/page/follow/${ast.uid}`,
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'server-version': 'v2025.10.31.1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'x-requested-with': 'XMLHttpRequest',
                'x-xsrf-token': token?.value!,
                'cookie': selection.cookieHeader
            }
        });

        if (response.status === 200) {
            const body = await response.json() as WeiboAjaxFriendshipsResponse;
            ast.state = body.ok === 1 ? 'success' : 'fail';

            if (body.ok !== 1) {
                console.error(`[WeiboAjaxFriendshipsAstVisitor] Cookie 无效或已过期，ok=${body.ok}`);
            }

            return ast;
        }

        ast.state = 'fail';
        console.error(`[WeiboAjaxFriendshipsAstVisitor] HTTP ${response.status}: ${response.statusText}`);
        return ast;
    }
}
