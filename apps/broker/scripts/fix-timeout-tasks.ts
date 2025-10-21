#!/usr/bin/env node

import { Pool } from 'pg';

// 数据库连接配置
const pool = new Pool({
  host: '43.240.223.138',
  port: 5432,
  user: 'postgres',
  password: 'Postgres2025Secure',
  database: 'vectordb',
});

async function fixTimeoutTasks() {
  try {
    console.log('🔧 开始修复 TIMEOUT 状态的任务...');
    console.log('✅ 数据库连接成功');

    const client = await pool.connect();

    try {
      // 查询现有的 TIMEOUT 任务
      const timeoutResult = await client.query(
        `SELECT COUNT(*) as count FROM weibo_search_tasks WHERE status = 'TIMEOUT'`
      );

      const timeoutCount = parseInt(timeoutResult.rows[0].count);
      console.log(`📊 发现 ${timeoutCount} 个 TIMEOUT 状态的任务`);

      if (timeoutCount > 0) {
        // 更新 TIMEOUT 任务为 PENDING 状态
        const updateResult = await client.query(`
          UPDATE weibo_search_tasks
          SET
            status = 'PENDING',
            enabled = true,
            next_run_at = NOW() + INTERVAL '1 hour',
            error_message = CASE
              WHEN error_message LIKE '%超时%' THEN error_message || ' - 已自动恢复为PENDING状态'
              ELSE COALESCE(error_message, '') || ' - 从TIMEOUT状态自动恢复'
            END,
            updated_at = NOW()
          WHERE status = 'TIMEOUT'
        `);

        console.log(`✅ 成功更新 ${updateResult.rowCount} 个任务为 PENDING 状态`);
      } else {
        console.log('ℹ️  没有发现 TIMEOUT 状态的任务');
      }

      // 验证更新结果
      const statusResult = await client.query(`
        SELECT
          status,
          COUNT(*) as task_count,
          enabled
        FROM weibo_search_tasks
        GROUP BY status, enabled
        ORDER BY status, enabled
      `);

      console.log('\n📈 任务状态统计:');
      console.table(statusResult.rows);

    } finally {
      client.release();
    }

    await pool.end();
    console.log('🎉 TIMEOUT 任务修复完成！');

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行修复
fixTimeoutTasks();