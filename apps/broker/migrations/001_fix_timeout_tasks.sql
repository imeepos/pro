-- 更新数据库中现有的 TIMEOUT 状态任务为 PENDING 状态
-- 修复超时任务处理逻辑，让超时的任务能够在下一周期继续执行

-- 将所有 TIMEOUT 状态的任务改为 PENDING 状态
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
WHERE status = 'TIMEOUT';

-- 显示更新了多少条记录
DO $$
DECLARE
  updated_count integer;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '已更新 % 个TIMEOUT状态的任务为PENDING状态', updated_count;
END $$;

-- 验证更新结果
SELECT
  status,
  COUNT(*) as task_count,
  enabled
FROM weibo_search_tasks
GROUP BY status, enabled
ORDER BY status, enabled;