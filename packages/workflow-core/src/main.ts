import { execute, WorkflowGraphAst } from './index'
import { registerMqQueues } from './tokens'

export async function main() {
    registerMqQueues();
    const workflow = new WorkflowGraphAst()
    const state = await execute(workflow, {})
    console.log({ state })
}

main()