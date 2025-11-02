import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { RedisClient } from "./index.js";


export async function main(){
    const redis = root.get(RedisClient)
    console.log({redis})
}
main();