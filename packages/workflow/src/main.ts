import { writeFileSync } from "fs";
import { createHtmlParserAst, createPlaywrightAst, createWeiboKeywordSearchAst } from "./ast";
import { WorkflowBuilder } from "./builder";
import { execute, ExecutorVisitor } from "./executor";

export async function main() {
    const builder = new WorkflowBuilder()
    const startDate = new Date()
    startDate.setDate(1)
    const keywordNode = createWeiboKeywordSearchAst({ keyword: '国庆', start: startDate, end: new Date() })
    const PlaywrightNode = createPlaywrightAst({
        url: `https://s.weibo.com/weibo?q=%E5%9B%BD%E5%BA%86`,
        ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36`,
        cookies: `SINAGLOBAL=8413704240580.307.1739231090045; SCF=AuYo_SrUXb6gLwX6ih_kbNjbKsVLDHKRKv3OAg35CphqrbEGGkDhqmTU7J8HNUlh_pelnhnh43u1-0igKKEc6IY.; XSRF-TOKEN=J52bP8kXAofEgp8Fta0WWl4G; PC_TOKEN=64f5d898dd; SUB=_2A25F_lFUDeThGeFK61cS8SnMzT6IHXVncuycrDV8PUNbmtANLW7hkW9NQ7UrCJMydBV1sx4U8HlAbFGn931diBrM; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9Wh1iD5rf0swqzI.Uaik9On05JpX5KzhUgL.FoMXeh-0eKM7Soz2dJLoIE2LxKqL1-BLBKnLxKqL1KnL12-LxKqL1KnL12-Eeh54eh.t; ALF=02_1763814916; WBPSESS=jpacQG6xfQIGS6MotSc5S9ko8NhE3p1PlfQDC3NSNUrys7XrQazjWq1jl2WGczGEoshz0CzxYHRmPUn8RJxaHbHGA_DKi8-qPwYPhizfNtGxgC_0v5zknJK9x8bcYGpwwz_nJK-yZP2jhtKe6-br8w==; _s_tentry=weibo.com; Apache=1922626744231.3472.1761222931696; ULV=1761222931697:4:1:1:1922626744231.3472.1761222931696:1757661682170`
    })
    const htmlParserAst = createHtmlParserAst({
        html: ``,
        url: ``,
        start: new Date()
    })
    const workflow = builder
        .addAst(keywordNode)
        .addAst(PlaywrightNode)
        .addAst(htmlParserAst)
        .addEdge({
            from: keywordNode.id,
            to: htmlParserAst.id,
            fromProperty: 'start',
            toProperty: `start`
        })
        .addEdge({
            from: keywordNode.id,
            to: PlaywrightNode.id,
            fromProperty: 'url',
            toProperty: 'url'
        })
        .addEdge({
            from: PlaywrightNode.id,
            to: htmlParserAst.id,
            fromProperty: 'url',
            toProperty: 'url'
        })
        .addEdge({
            from: PlaywrightNode.id,
            to: htmlParserAst.id,
            fromProperty: 'html',
            toProperty: 'html'
        })
        .build(`weibo_keyword_search`)

    const executer = new ExecutorVisitor()
    console.log(`开始执行`)
    let currentState = await execute(workflow, executer, {
        send(...args: any[]) {
            console.log(`发送事件`, args)
        }
    })
    console.log(`执行结束`)
    writeFileSync(`1.json`, JSON.stringify(currentState, null, 2))
}

main()