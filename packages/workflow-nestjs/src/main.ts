import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/workflow-core";
import { from, switchMap } from "rxjs";
import { createPostDetailCrawlQueue } from "./utils";
import { runPostDetailWorkflow } from "./runPostDetailWorkflow";

async function main() {
    registerMqQueues()
    await root.init()
    const postDetail = createPostDetailCrawlQueue()
    const { run } = await runPostDetailWorkflow()
    postDetail.consumer$.pipe(
        switchMap(res => {
            return from(run(res.message.mid))
        })
    ).subscribe()
}

main();