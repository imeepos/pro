import { createHtmlParserAst, createMqConsumerAst, createMqPublisherAst, createPlaywrightAst, createWeiboKeywordSearchAst, createWorkflowGraphAst } from "./ast"

export function generateAst(state: any) {
    if (!state) throw new Error(`state is null`)
    switch (state.type) {
        case "WorkflowGraphAst":
            return createWorkflowGraphAst(state)
        case "PlaywrightAst":
            return createPlaywrightAst(state)
        case "HtmlParserAst":
            return createHtmlParserAst(state)
        case "WeiboKeywordSearchAst":
            return createWeiboKeywordSearchAst(state)
        case "MqConsumerAst":
            return createMqConsumerAst(state)
        case "MqPublisherAst":
            return createMqPublisherAst(state)
        default:
            throw new Error(`${state.type} not support`)
    }
}
