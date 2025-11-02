import "reflect-metadata";
import { config } from "dotenv";
import { useEntityManager, UserEntity } from "./index.js";
export async function main() {
    config();
    const user = await useEntityManager(async m => {
        return m.findOne(UserEntity, { where: {} })
    })
    console.log({ user })
}


main();