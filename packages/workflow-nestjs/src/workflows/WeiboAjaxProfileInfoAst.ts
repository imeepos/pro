import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input } from "@pro/workflow-core";
import { WeiboAccountService } from "../services/weibo-account.service";
import { useEntityManager, UserEntity, WeiboUserEntity } from "@pro/entities";


export interface WeiboAjaxProfileInfoAstResponse {
    ok: number;
    data: {
        user: UserEntity;
    }
}

export interface WeiboAjaxProfileDetailResponse {
    ok: number;
    data: any;
}
export class WeiboAjaxProfileInfoAst extends Ast {

    @Input()
    uid: string;
}

@Injectable()
export class WeiboAjaxProfileInfoAstVisitor {

    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }

    @Handler(WeiboAjaxProfileInfoAst)
    async visit(ast: WeiboAjaxProfileInfoAst, _ctx: any) {
        return this.fetch(ast, _ctx)
    }


    async detail(ast: WeiboAjaxProfileInfoAst, _ctx: any) {
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
        const response = await fetch(`https://weibo.com/ajax/profile/detail?uid=${ast.uid}`, {
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
            const body = await response.json() as WeiboAjaxProfileDetailResponse;
            try {
                await useEntityManager(async m => {
                    const user = m.create(WeiboUserEntity, { detail: body.data, id: Number(ast.uid) })
                    await m.upsert(WeiboUserEntity, user as any, ['id'])
                })
            } catch (error) {
                console.error(`[WeiboAjaxProfileInfoAstVisitor] postId: ${ast.id}`, error);
            }
            ast.state = body.ok === 1 ? 'success' : 'fail'
            return ast;
        }
        ast.state = 'fail'
        console.error(response.statusText)
        return ast;
    }

    async fetch(ast: WeiboAjaxProfileInfoAst, _ctx: any) {
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
        const url = `https://weibo.com/ajax/profile/info?uid=${ast.uid}`;
        const response = await fetch(url, {
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
            const body = await response.json() as WeiboAjaxProfileInfoAstResponse;
            try {
                await useEntityManager(async m => {
                    const user = m.create(WeiboUserEntity, body.data.user as any)
                    ast.uid = `${user.id}`;
                    await m.upsert(WeiboUserEntity, user as any, ['id'])
                })
                await this.detail(ast, _ctx);
            } catch (error) {
                console.error(`[WeiboAjaxProfileInfoAstVisitor] postId: ${ast.id}`, error);
            }
            ast.state = body.ok === 1 ? 'success' : 'fail'
            return ast;
        }
        ast.state = 'fail'
        console.error(response.statusText)
        return ast;
    }
}
