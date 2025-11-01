import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/rabbitmq";
import { from, switchMap } from "rxjs";
import { createPostDetailCrawlQueue } from "./utils";
import { runPostDetailWorkflow } from "./runPostDetailWorkflow";
import { WeiboAccountInitService } from "./services/weibo-account-init.service";

async function main() {
    root.set([
        WeiboAccountInitService
    ])
    registerMqQueues()
    await root.init()
    const postDetail = createPostDetailCrawlQueue()
    const { run } = await runPostDetailWorkflow()
    postDetail.consumer$.pipe(
        switchMap(res => {
            console.log(res.message)
            return from(run(res.message.mid).then(() => res.ack()).catch((e) => {
                console.error(e)
                process.exit()
            }))
        }),
    ).subscribe({
        error(_err: Error) {
            process.exit()
        },
    })
}

main();