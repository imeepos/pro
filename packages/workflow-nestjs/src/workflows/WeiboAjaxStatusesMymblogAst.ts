import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input, Node } from "@pro/workflow-core";
import { WeiboAccountService } from "../services/weibo-account.service";
import { useEntityManager, WeiboPostEntity } from "@pro/entities";
import { delay } from "../utils";


export interface WeiboAjaxStatusesMymblogAstResponse {
    ok: number;
    data: {
        list: any[];
    }
}

@Node()
export class WeiboAjaxStatusesMymblogAst extends Ast {

    @Input()
    uid: string;

    @Input()
    page: number = 1;
}


@Injectable()
export class WeiboAjaxStatusesMymblogAstVisitor {
    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }

    @Handler(WeiboAjaxStatusesMymblogAst)
    async visit(ast: WeiboAjaxStatusesMymblogAst, _ctx: any) {
        ast.state = 'running';
        while (ast.state === 'running') {
            ast = await this.fetch(ast, _ctx)
            ast.page = ast.page + 1;
            await delay()
        }
        return ast;
    }

    async fetch(ast: WeiboAjaxStatusesMymblogAst, _ctx: any) {
        const selection = await this.account.selectBestAccount();
        if (!selection) {
            ast.state = 'fail';
            console.error(`[WeiboAjaxStatusesRepostTimelineAstVisitor] 没有可用账号`)
            return ast;
        }
        const cookies = selection.cookieHeader.split(';').map(it => it.split('=').map(it => it.trim()))
        const token = cookies.map(([name, value]) => {
            return { name, value }
        }).find((it) => {
            return it.name === `XSRF-TOKEN`
        })
        const response = await fetch(`https://weibo.com/ajax/statuses/mymblog?uid=${ast.uid}&page=${ast.page}&feature=0`, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'client-version': 'v2.47.129',
                'priority': 'u=1, i',
                'referer': `https://weibo.com/u/${ast.uid}`,
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'server-version': 'v2025.10.24.3',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'x-requested-with': 'XMLHttpRequest',
                'x-xsrf-token': token?.value!,
                'cookie': selection.cookieHeader
            }
        });

        if (response.status === 200) {
            const body = await response.json() as WeiboAjaxStatusesMymblogAstResponse;
            try {
                await useEntityManager(async m => {
                    const posts = body.data.list.map(item => m.create(WeiboPostEntity, item))
                    await m.upsert(WeiboPostEntity, posts as any, ['id'])
                })
            } catch (error) {
                console.error(`[WeiboAjaxProfileInfoAstVisitor] postId: ${ast.id}`, error);
            }
            ast.state = body.data.list.length > 0 ? 'running' : 'success'
            return ast;
        }
        ast.state = 'fail'
        console.error(response.statusText)
        return ast;
    }
}