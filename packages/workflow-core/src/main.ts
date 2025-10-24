import { execute, WorkflowGraphAst } from './index'

export async function main() {
    const workflow = new WorkflowGraphAst()
    const state = await execute(workflow)
    console.log({ state })
}

main()