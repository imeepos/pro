import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input, Node } from "@pro/workflow-core";
import { WeiboAccountService } from "../services/weibo-account.service";
import { delay } from "../utils";
import { useEntityManager, WeiboPostEntity, WeiboUserEntity } from "@pro/entities";

export interface WeiboAjaxFeedHotTimelineResponse {
    readonly ok: number;
    readonly data: {
        statuses: WeiboPostEntity[];
        since_id: string;
        max_id: string;
        total_number: number;
    };
}

@Node()
export class WeiboAjaxFeedHotTimelineAst extends Ast {

    @Input()
    group_id: string = '102803600343';

    @Input()
    containerid: string = '102803_ctg1_600343_-_ctg1_600343';

    @Input()
    extparam: string = 'discover%7Cnew_feed';

    @Input()
    max_id: string = '0';

    @Input()
    since_id: string = '0';

    @Input()
    count: number = 10;

    @Input()
    refresh: number = 1;

    type: 'WeiboAjaxFeedHotTimelineAst' = 'WeiboAjaxFeedHotTimelineAst';
}

@Injectable()
export class WeiboAjaxFeedHotTimelineAstVisitor {

    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }

    @Handler(WeiboAjaxFeedHotTimelineAst)
    async visit(ast: WeiboAjaxFeedHotTimelineAst, _ctx: any) {
        ast.state = 'running';
        let pageCount = 0;

        while (ast.state === 'running') {
            pageCount++;
            ast = await this.fetch(ast, _ctx);
            await delay();
        }

        console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 完成，共抓取 ${pageCount} 页数据`);
        return ast;
    }

    private async fetch(ast: WeiboAjaxFeedHotTimelineAst, _ctx: any) {
        const selection = await this.account.selectBestAccount();
        if (!selection) {
            ast.state = 'fail';
            console.error(`[WeiboAjaxFeedHotTimelineAstVisitor] 没有可用账号`);
            return ast;
        }

        const cookies = selection.cookieHeader.split(';').map(it => it.split('=').map(it => it.trim()));
        const token = cookies.map(([name, value]) => {
            return { name, value }
        }).find((it) => {
            return it.name === `XSRF-TOKEN`
        });

        const url = new URL('https://weibo.com/ajax/feed/hottimeline');
        url.searchParams.set('since_id', ast.since_id);
        url.searchParams.set('refresh', String(ast.refresh));
        url.searchParams.set('group_id', ast.group_id);
        url.searchParams.set('containerid', ast.containerid);
        url.searchParams.set('extparam', ast.extparam);
        url.searchParams.set('max_id', ast.max_id);
        url.searchParams.set('count', String(ast.count));

        const response = await fetch(url.toString(), {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'client-version': 'v2.47.130',
                'priority': 'u=1, i',
                'referer': `https://weibo.com/hot/weibo/${ast.group_id}`,
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
            const body = await response.json() as WeiboAjaxFeedHotTimelineResponse;

            if (body.ok !== 1) {
                ast.state = 'fail';
                console.error(`[WeiboAjaxFeedHotTimelineAstVisitor] API 返回失败，ok=${body.ok}`);
                return ast;
            }

            const statuses = body.data?.statuses || [];

            if (statuses.length === 0) {
                ast.state = 'success';
                console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 没有更多数据，抓取完成`);
                return ast;
            }

            try {
                await useEntityManager(async m => {
                    const users = statuses
                        .filter(item => item.user)
                        .map(item => m.create(WeiboUserEntity, item.user as any));

                    if (users.length > 0) {
                        await m.upsert(WeiboUserEntity, users as any[], ['id']);
                    }

                    const posts = statuses.map(item => m.create(WeiboPostEntity, item as any));
                    await m.upsert(WeiboPostEntity, posts as any[], ['id']);

                    console.log(`[WeiboAjaxFeedHotTimelineAstVisitor] 成功入库 ${posts.length} 条微博，${users.length} 个用户`);
                });

                ast.max_id = body.data.max_id;
                ast.since_id = body.data.since_id;
                ast.state = 'running';

            } catch (error) {
                console.error(`[WeiboAjaxFeedHotTimelineAstVisitor] 数据入库失败`, error);
                ast.state = 'fail';
            }

            return ast;
        }

        ast.state = 'fail';
        console.error(`[WeiboAjaxFeedHotTimelineAstVisitor] HTTP ${response.status}: ${response.statusText}`);
        return ast;
    }
}
