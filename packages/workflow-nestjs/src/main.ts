import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/workflow-core";
import { from, switchMap } from "rxjs";
import { createPostDetailCrawlQueue } from "./utils";

async function main() {
    registerMqQueues()
    await root.init()
    const postDetail = createPostDetailCrawlQueue()
    postDetail.consumer$.pipe(
        switchMap(res => {
            return from([res.message])
        })
    ).subscribe()
}

main();