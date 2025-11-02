import "reflect-metadata";
import "dotenv/config";
import { runWeiboDetailWorkflow } from './runWeiboDetailWorkflow'
async function test() {
    await runWeiboDetailWorkflow(`Qbug75SHT`, ``)
    process.exit(0);
}

test().catch(err => {
    console.error(`[测试异常]`, err);
    process.exit(1);
});
