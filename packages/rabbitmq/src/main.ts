import 'dotenv/config';
import "reflect-metadata";

import { root } from "@pro/core"
import { RabbitMQService } from "./rabbitmq.service.js"

export async function main(){
    const mq: RabbitMQService = root.get(RabbitMQService)
    await mq.onModuleInit()
    console.log(`mq is connected is ${mq.isConnected()}`)
    await mq.ngOnDestroy()
}

main()
