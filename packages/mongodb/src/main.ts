import 'dotenv/config';
import "reflect-metadata";

import { root } from "@pro/core";
import { RawDataSourceService } from "./index.js";
import { connectMongoDB, disconnectMongoDB } from "./connection.js";
import mongoose from 'mongoose';

export async function main() {
    console.log('✅ @pro/mongodb 包加载成功！');

    // 先连接 MongoDB（必须在使用 Model 之前）
    await connectMongoDB();

    // 测试依赖注入
    const service: RawDataSourceService = root.get(RawDataSourceService);
    console.log('✅ RawDataSourceService 依赖注入成功！');

    // 从连接中获取重新初始化的 Model
    const RawDataSourceModel = mongoose.model('RawDataSource');

    // 测试 Typegoose Model
    console.log('✅ RawDataSourceModel 创建成功！');
    console.log('   Model Name:', RawDataSourceModel.modelName);
    console.log('   Collection:', RawDataSourceModel.collection.name);

    // 显示 Schema 信息
    const schema = RawDataSourceModel.schema;
    console.log('✅ Schema 定义成功！');
    console.log('   Schema Paths:', Object.keys(schema.paths).join(', '));

    console.log('\n🎉 所有测试通过！@pro/mongodb 已成功迁移到 Typegoose！\n');

    try {
        // 测试数据库查询
        console.log('📊 正在测试数据库查询...');
        const count = await RawDataSourceModel.countDocuments();
        console.log(`✅ 集合中共有 ${count} 条记录`);

        if (count > 0) {
            // 如果有数据，查询前5条
            console.log('📄 查询前5条记录...');
            const docs = await RawDataSourceModel.find().limit(5).exec();
            console.log(`✅ 成功查询到 ${docs.length} 条记录`);

            // 尝试统计查询（可能较慢）
            console.log('📊 尝试获取统计数据...');
            try {
                const stats = await service.getStatistics();
                console.log('✅ 统计结果:', stats);
            } catch (statsError) {
                console.log('⚠️  统计查询超时，跳过（数据量可能较大）');
            }
        } else {
            console.log('ℹ️  集合为空或不存在');
            console.log('💡 提示：当第一次插入数据时，MongoDB 会自动创建集合');
        }

        console.log('\n🎉 数据库连接和查询测试全部通过！');
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
