import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input, Node, Output } from "@pro/workflow-core";
import { WeiboAccountService } from "../services/weibo-account.service";
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@pro/entities";


export interface WeiboAjaxStatusesShowAstReponse extends WeiboPostEntity {
    ok: number;
}

@Node()
export class WeiboAjaxStatusesShowAst extends Ast {
    @Input()
    mblogid: string;

    @Output()
    uid: string;

    @Output()
    mid: string;

    type: `WeiboAjaxStatusesShowAst` = `WeiboAjaxStatusesShowAst`
}

@Injectable()
export class WeiboAjaxStatusesShowAstVisitor {
    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }

    @Handler(WeiboAjaxStatusesShowAst)
    async visit(ast: WeiboAjaxStatusesShowAst, _ctx: any) {
        return await this.fetch(ast, _ctx)
    }

    async fetch(ast: WeiboAjaxStatusesShowAst, _ctx: any) {
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
        const url = `https://weibo.com/ajax/statuses/show?id=${ast.mblogid}&locale=zh-CN&isGetLongText=true`
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'client-version': 'v2.47.129',
                'priority': 'u=1, i',
                'referer': 'https://weibo.com/2744950651/Qbug75SHT',
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
            const body = await response.json() as WeiboAjaxStatusesShowAstReponse;
            try {
                await useEntityManager(async m => {
                    const user = m.create(WeiboUserEntity, body.user as any)
                    ast.uid = `${user.id}`;
                    await m.upsert(WeiboUserEntity, user as any, ['id'])
                    const post = m.create(WeiboPostEntity, body)
                    ast.mid = post.mid;
                    await m.upsert(WeiboPostEntity, post as any, ['id'])
                })
            } catch (error) {
                console.error(`[WeiboAjaxStatusesRepostTimelineAstVisitor] postId: ${ast.id}`, error);
            }
            ast.state = body.ok === 1 ? 'success' : 'fail'
            return ast;
        }
        ast.state = 'fail'
        console.error(response.statusText)
        return ast;
    }
}