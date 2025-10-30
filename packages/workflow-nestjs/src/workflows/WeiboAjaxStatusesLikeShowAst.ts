

/**
 * 
 */

import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input, Node } from "@pro/workflow-core"
import { WeiboAccountService } from "../services/weibo-account.service";
import { useEntityManager, WeiboUserEntity } from "@pro/entities";
import { delay } from "../utils";

// curl 'https://weibo.com/ajax/statuses/likeShow?id=5227379271401937&attitude_type=0&attitude_enable=1&page=1&count=10' \
// -H 'sec-ch-ua-platform: "Windows"' \
// -H 'X-XSRF-TOKEN: uxoLsKgLvU34CDxltszyRlnq' \
// -H 'Referer: https://weibo.com/2744950651/Qbug75SHT' \
// -H 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' \
// -H 'server-version: v2025.10.24.3' \
// -H 'sec-ch-ua-mobile: ?0' \
// -H 'X-Requested-With: XMLHttpRequest' \
// -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' \
// -H 'Accept: application/json, text/plain, */*' \
// -H 'client-version: v2.47.129'

export interface WeiboStatusAttitude {
    readonly user: WeiboUserEntity;
    readonly attitude: number
}

export interface WeiboStatusLikeShowResponse {
    readonly ok: number
    readonly data: WeiboStatusAttitude[]
    readonly total_number: number
}

@Node()
export class WeiboAjaxStatusesLikeShowAst extends Ast {

    @Input()
    postId: string;
    @Input()
    page: number = 1;
    @Input()
    count: number = 20;
    /**
     * 默认值
     */
    @Input()
    attitude_type: number = 0;
    @Input()
    attitude_enable: number = 1;
}

@Injectable()
export class WeiboAjaxStatusesLikeShowAstVisitor {
    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }
    @Handler(WeiboAjaxStatusesLikeShowAst)
    async handler(ast: WeiboAjaxStatusesLikeShowAst, _ctx: any) {
        ast.state = 'running';
        while (ast.state === 'running') {
            ast = await this.fetch(ast, _ctx)
            ast.page = ast.page + 1;
            await delay()
        }
        return ast;
    }


    private async fetch(ast: WeiboAjaxStatusesLikeShowAst, _ctx: any) {
        const selection = await this.account.selectBestAccount();
        if (!selection) {
            ast.state = 'fail';
            console.error(`没有可用账号`)
            return ast;
        }
        const cookies = selection.cookieHeader.split(';').map(it => it.split('=').map(it => it.trim()))
        const token = cookies.map(([name, value]) => {
            return { name, value }
        }).find((it) => {
            return it.name === `XSRF-TOKEN`
        })
        const url = `https://weibo.com/ajax/statuses/likeShow?id=${ast.postId}&attitude_type=${ast.attitude_type}&attitude_enable=${ast.attitude_enable}&page=${ast.page}&count=${ast.count}`
        console.log(`fetch url: ${url}`)
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
            const body = await response.json() as WeiboStatusLikeShowResponse;
            try {
                await useEntityManager(async m => {
                    const userEntities = body.data.map(item => {
                        const user = item.user;
                        return m.create(WeiboUserEntity, user)
                    });
                    console.log(`[${ast.page}]处理${userEntities.length}个用户`)
                    await m.upsert(WeiboUserEntity, userEntities as any[], ['id'])
                    // 插入点赞表
                    return userEntities;
                })
            } catch (error) {
                console.error(`[点赞保存失败] postId: ${ast.postId}`, error);
            }
            ast.state = body.data.length > 0 ? 'running' : 'success'
            return ast;
        }
        ast.state = 'fail'
        console.error(response.statusText)
        return ast;
    }
}
