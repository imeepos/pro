import { WorkflowGraphAst } from "@pro/workflow-core";
import { WeiboAjaxStatusesShowAst, WeiboAjaxStatusesShowAstVisitor } from "./WeiboAjaxStatusesShowAst";
import { WeiboAjaxStatusesRepostTimelineAst, WeiboAjaxStatusesRepostTimelineAstVisitor } from "./WeiboAjaxStatusesRepostTimelineAst";
import { WeiboAjaxStatusesMymblogAst, WeiboAjaxStatusesMymblogAstVisitor } from "./WeiboAjaxStatusesMymblogAst";
import { WeiboAjaxStatusesLikeShowAst, WeiboAjaxStatusesLikeShowAstVisitor } from "./WeiboAjaxStatusesLikeShowAst";
import { WeiboAjaxStatusesCommentAst, WeiboAjaxStatusesCommentAstVisitor } from "./WeiboAjaxStatusesCommentAst";
import { root } from "@pro/core";
import { WeiboAjaxProfileInfoAst, WeiboAjaxProfileInfoAstVisitor } from "./WeiboAjaxProfileInfoAst";


export function runWeiboDetailWorkflow(mblogid: string, uid: string) {
    root.use([
        WeiboAjaxStatusesShowAstVisitor,
        WeiboAjaxStatusesRepostTimelineAstVisitor,
        WeiboAjaxStatusesMymblogAstVisitor,
        WeiboAjaxStatusesLikeShowAstVisitor,
        WeiboAjaxStatusesCommentAstVisitor,
        WeiboAjaxProfileInfoAstVisitor
    ])
    const show = new WeiboAjaxStatusesShowAst()
    show.mblogid = mblogid
    show.uid = uid;
    const timeline = new WeiboAjaxStatusesRepostTimelineAst()
    const mymblog = new WeiboAjaxStatusesMymblogAst()
    const like = new WeiboAjaxStatusesLikeShowAst()
    const comment = new WeiboAjaxStatusesCommentAst()
    const profile = new WeiboAjaxProfileInfoAst()

    const workflow = new WorkflowGraphAst()
    workflow.addNode(
        show
    )
    workflow.addNode(
        timeline
    )
    workflow.addNode(
        mymblog
    )
    workflow.addNode(comment)
    workflow.addNode(like)
    workflow.addNode(profile)
    workflow.addEdge({
        from: show.id,
        to: timeline.id,
        fromProperty: `mid`,
        toProperty: `mid`
    })
    workflow.addEdge({
        from: show.id,
        to: like.id,
        fromProperty: `mid`,
        toProperty: `mid`
    })
    workflow.addEdge({
        from: show.id,
        to: comment.id,
        fromProperty: `mid`,
        toProperty: `mid`
    })
    workflow.addEdge({
        from: show.id,
        to: comment.id,
        fromProperty: `uid`,
        toProperty: `uid`
    })
    workflow.addEdge({
        from: show.id,
        to: mymblog.id,
        fromProperty: `uid`,
        toProperty: `uid`
    })
    workflow.addEdge({
        from: show.id,
        to: profile.id,
        fromProperty: `uid`,
        toProperty: `uid`
    })
    return workflow;
}