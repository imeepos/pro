import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input, Node, Output } from "@pro/workflow-core";
import { WeiboAccountService } from "../services/weibo-account.service";
import { useEntityManager, WeiboCommentEntity, WeiboUserEntity } from "@pro/entities";
import { delay } from "../utils";


export interface WeiboAjaxStatusesComponentAstResponse {
    readonly ok: number
    readonly data: WeiboCommentEntity[]
    readonly filter_group: any[];
    readonly max_id: number
    readonly rootComment: any[];
    readonly total_number: number;
    readonly trendsText: string;
}

@Node()
export class WeiboAjaxStatusesCommentAst extends Ast {

    @Input()
    mid: string;

    @Input()
    uid: string;

    // 默认
    @Input()
    max_id: number | undefined;

    @Input()
    count: number = 20;

    @Input()
    is_show_bulletin: number = 3;

    @Input()
    is_mix: number = 0;

    @Input()
    fetch_level: number = 0;

    @Output()
    next_max_id: number;

    @Output()
    entities: WeiboCommentEntity[];

    type: `WeiboAjaxStatusesCommentAst` = `WeiboAjaxStatusesCommentAst`
}

@Injectable()
export class WeiboAjaxStatusesCommentAstVisitor {
    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }
    @Handler(WeiboAjaxStatusesCommentAst)
    async visit(ast: WeiboAjaxStatusesCommentAst, _ctx: any) {
        ast.state = 'running';
        while (ast.state === 'running') {
            ast = await this.fetch(ast, _ctx)
            ast.max_id = ast.next_max_id;
            await delay()
            if (ast.entities && ast.entities.length > 0) {
                for (let child of ast.entities) {
                    if (child.more_info) {
                        let childAst = new WeiboAjaxStatusesCommentAst()
                        childAst.mid = `${child.id}`;
                        childAst.is_show_bulletin = 2;
                        childAst.is_mix = 1;
                        childAst.fetch_level = 1;
                        childAst.max_id = 0;
                        childAst.count = 20;
                        childAst.uid = ast.uid;
                        await this.visitChildren(childAst, _ctx)
                    }
                }
            }
        }
        return ast;
    }

    async visitChildren(ast: WeiboAjaxStatusesCommentAst, _ctx: any) {
        ast.state = 'running';
        while (ast.state === 'running') {
            ast = await this.fetch(ast, _ctx)
            ast.max_id = ast.next_max_id;
            await delay()
        }
        return ast;
    }

    async fetch(ast: WeiboAjaxStatusesCommentAst, _ctx: any) {
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
        // https://weibo.com/ajax/statuses/buildComments?is_reload=1&id=5227379271401937&is_show_bulletin=3&is_mix=0&count=10&uid=2744950651&fetch_level=0&locale=zh-CN
        // https://weibo.com/ajax/statuses/buildComments?is_reload=1&id=5227379397493201&is_show_bulletin=3&is_mix=0&count=20&uid=2744950651&fetch_level=0&locale=zh-CN
        let url = `https://weibo.com/ajax/statuses/buildComments?is_reload=1&id=${ast.mid}&is_show_bulletin=${ast.is_show_bulletin}&is_mix=${ast.is_mix}&count=${ast.count}&uid=${ast.uid}&fetch_level=${ast.fetch_level}&locale=zh-CN`
        if (ast.max_id) url += `&max_id=${ast.max_id}`
        console.log(`url is: ${url}`)
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
                'x-requested-with': token?.value!,
                'x-xsrf-token': 'uxoLsKgLvU34CDxltszyRlnq',
                'cookie': selection.cookieHeader
            }
        });

        if (response.status === 200) {
            const body = await response.json() as WeiboAjaxStatusesComponentAstResponse;
            try {
                const entities = await useEntityManager(async m => {
                    const userMap = new Map<number, WeiboUserEntity>();
                    body.data.forEach(item => {
                        if (item.user?.id) {
                            userMap.set(item.user.id as number, m.create(WeiboUserEntity, item.user));
                        }
                    });
                    const users = Array.from(userMap.values());
                    if (users.length > 0) {
                        const BATCH_SIZE = 5;
                        for (let i = 0; i < users.length; i += BATCH_SIZE) {
                            const batch = users.slice(i, i + BATCH_SIZE);
                            await m.upsert(WeiboUserEntity, batch as any, ['id']);
                        }
                    }
                    const entities = body.data.map(item => m.create(WeiboCommentEntity, item))
                    await m.upsert(WeiboCommentEntity, entities as any[], ['id'])
                    return entities;
                });
                ast.entities = entities;
                console.log(`[WeiboAjaxStatusesComponentAstVisitor] 共${entities.length}个`)
                ast.next_max_id = body.max_id;
                ast.state = body.max_id ? 'running' : 'success'
                return ast;
            } catch (error) {
                console.error(`[WeiboAjaxStatusesRepostTimelineAstVisitor] mid: ${ast.mid}`, error);
            }
            ast.state = body.data.length > 0 ? 'running' : 'success'
            return ast;
        }
        ast.state = 'fail'
        console.error(response.statusText)

        return ast;
    }
}