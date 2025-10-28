import 'dotenv/config';
import "reflect-metadata";
import { root } from "@pro/core"
export async function main(){
    await root.init();
    process.exit(0)
}
main()
