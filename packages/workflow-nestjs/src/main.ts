import { root } from "@pro/core";
import { runWeiBoKeywordSearchWorkflow } from "./runWeiBoKeywordSearchWorkflow";

async function main() {
    await root.init()
    await runWeiBoKeywordSearchWorkflow(`国庆`, new Date(`2025-10-28 22:00:00`))
}

main();