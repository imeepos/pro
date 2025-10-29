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
            console.log(res.message)
            return from(run(res.message.mid).then(() => res.ack()).catch(() => res.nack()))
        }),
    ).subscribe({
        error(_err: Error) {
            process.exit()
        },
    })
}

main();