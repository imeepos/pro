import { Ast, createHtmlParserAst, createMqConsumerAst, createMqPublisherAst, createPlaywrightAst, createWorkflowGraphAst } from "./ast"

export function generateAst(state: any) {
    if (!state) throw new Error(`state is null`)
    if (state instanceof Ast) {
        return state;
    }
    if (state && typeof state.visit === 'function' && typeof state.type === 'string') {
        return state as Ast;
    }
    switch (state.type) {
        case "WorkflowGraphAst":
            return createWorkflowGraphAst(state)
        case "PlaywrightAst":
            return createPlaywrightAst(state)
        case "HtmlParserAst":
            return createHtmlParserAst(state)
        case "MqConsumerAst":
            return createMqConsumerAst(state)
        case "MqPublisherAst":
            return createMqPublisherAst(state)
        default:
            throw new Error(`${state.type} not support`)
    }
}
