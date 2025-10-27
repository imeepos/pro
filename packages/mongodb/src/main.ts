import 'dotenv/config';
import "reflect-metadata";
import { root } from "@pro/core";
import { RawDataSourceService } from "./index.js";
import { connectMongoDB, disconnectMongoDB } from "./connection.js";

export async function main() {
    console.log('✅ @pro/mongodb 包加载成功！');
    // 先连接 MongoDB（必须在使用 Model 之前）
    await connectMongoDB();
    // 测试依赖注入
    const service: RawDataSourceService = root.get(RawDataSourceService);
    console.log('✅ RawDataSourceService 依赖注入成功！');
    try {
        const stats = await service.getStatistics();
        console.log('✅ 统计结果:', stats);
    } catch (error) {
        console.error('❌ 测试失败:', error instanceof Error ? error.message : error);
        console.log('ℹ️  这可能是因为网络问题或权限不足');
    } finally {
        // 确保断开连接
        await disconnectMongoDB();
    }
}

main().catch((error) => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
});
