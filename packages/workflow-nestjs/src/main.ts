import { root } from "@pro/core";
import { runWeiBoKeywordSearchWorkflow } from "./runWeiBoKeywordSearchWorkflow";
import { RabbitMQService } from "@pro/rabbitmq";



async function main() {
    const mq = root.get(RabbitMQService)
    await mq.onModuleInit();
    await runWeiBoKeywordSearchWorkflow(`国庆`, new Date(`2025-10-28 22:00:00`))
}

main();