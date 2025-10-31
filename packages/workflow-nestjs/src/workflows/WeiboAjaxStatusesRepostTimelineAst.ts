


// curl 'https://weibo.com/ajax/statuses/repostTimeline?id=5227379271401937&page=1&moduleID=feed&count=10' \
//   -H 'accept: application/json, text/plain, */*' \
//   -H 'accept-language: zh-CN,zh;q=0.9' \
//   -H 'client-version: v2.47.129' \
//   -b 'SINAGLOBAL=9396892910086.902.1755085034992; SCF=ApqfCifXo1dk0hdzIn-VyWsRlAFYnzhho5f52UWxGuwXiFtd5IkY3bALlL2XY4H_86kl3SaBv232y4FmgYyFTZI.; ULV=1761267355377:9:6:3:2125175464110.4038.1761267355375:1761105086393; ALF=1763941470; SUB=_2A25F-H8ODeThGeNM41QT9CrIzD2IHXVndP7GrDV8PUJbkNANLVTEkW1NSecf_kaTft3_stRki3sCybaZG2B-qR69; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WFsQ1UB-nLWxMRUwHTCcIKn5JpX5KMhUgL.Fo-E1hqEShBXS022dJLoIE5LxKBLB.2L12eLxK-L1h5L12BLxKBLB.BL1Ke4S0nfeBtt; XSRF-TOKEN=uxoLsKgLvU34CDxltszyRlnq; WBPSESS=7B6hG5UvbQE9yJng-oxNCQFU2vnXVrng4jdEF0SkK9_YduBl7xwZHFYySnbWqtvq_143GvWP2lOfOCY9bm__ookl6xehuv0bq2Hz0beWttDLnE8Fgd5jeKnysPHvkF7HxjClnHnfFkQfFdWrD0yhIQ==' \
//   -H 'priority: u=1, i' \
//   -H 'referer: https://weibo.com/2744950651/Qbug75SHT' \
//   -H 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' \
//   -H 'sec-ch-ua-mobile: ?0' \
//   -H 'sec-ch-ua-platform: "Windows"' \
//   -H 'sec-fetch-dest: empty' \
//   -H 'sec-fetch-mode: cors' \
//   -H 'sec-fetch-site: same-origin' \
//   -H 'server-version: v2025.10.24.3' \
//   -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' \
//   -H 'x-requested-with: XMLHttpRequest' \
//   -H 'x-xsrf-token: uxoLsKgLvU34CDxltszyRlnq'

import { Inject, Injectable } from "@pro/core";
import { Ast, Handler, Input, Node } from "@pro/workflow-core";
import { WeiboAccountService } from "../services/weibo-account.service";
import { delay } from "../utils";
import { useEntityManager, WeiboRepostEntity, WeiboUserEntity } from "@pro/entities";

export interface WeiboAjaxStatusesRepostTimelineResponse {
    readonly ok: number
    readonly data: WeiboRepostEntity[]
    readonly max_page: number
    readonly next_cursor: number
    readonly total_number: number;
}

@Node()
export class WeiboAjaxStatusesRepostTimelineAst extends Ast {

    @Input()
    mid: string;

    @Input()
    page: number = 1;

    type: `WeiboAjaxStatusesRepostTimelineAst` = `WeiboAjaxStatusesRepostTimelineAst`

}

@Injectable()
export class WeiboAjaxStatusesRepostTimelineAstVisitor {
    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }

    @Handler(WeiboAjaxStatusesRepostTimelineAst)
    async visit(ast: WeiboAjaxStatusesRepostTimelineAst, _ctx: any) {
        ast.state = 'running';
        while (ast.state === 'running') {
            ast = await this.fetch(ast, _ctx)
            ast.page = ast.page + 1;
            await delay()
        }
        return ast;
    }

    private async fetch(ast: WeiboAjaxStatusesRepostTimelineAst, _ctx: any) {
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
        const response = await fetch(`https://weibo.com/ajax/statuses/repostTimeline?id=${ast.mid}&page=${ast.page}&moduleID=feed&count=10`, {
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
            const body = await response.json() as WeiboAjaxStatusesRepostTimelineResponse;
            try {
                await useEntityManager(async m => {
                    const users = body.data.map(item => {
                        return m.create(WeiboUserEntity, item.user)
                    })
                    await m.upsert(WeiboUserEntity, users as any[], ['id'])
                    const entities = body.data.map(item => {
                        return m.create(WeiboRepostEntity, item)
                    });
                    console.log(`[WeiboAjaxStatusesRepostTimelineAstVisitor] ${ast.page} 页 共${entities.length}条数据`)
                    await m.upsert(WeiboRepostEntity, entities as any[], ['id'])
                    return entities;
                })
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