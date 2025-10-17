-- 修复 Bug 状态枚举值：将小写值转换为大写
-- 问题：数据库中存在小写的 status 值（如 'open'），但代码定义使用大写（'OPEN'）

-- Step 1: 备份当前数据（可选，用于排查问题）
DO $$
BEGIN
  RAISE NOTICE '当前 bugs 表中的状态分布:';
END $$;

SELECT status, COUNT(*) as count
FROM bugs
GROUP BY status
ORDER BY status;

-- Step 2: 更新所有小写状态值为大写
UPDATE bugs
SET status = UPPER(status)
WHERE status IN ('open', 'in_progress', 'resolved', 'closed', 'rejected', 'reopened');

-- Step 3: 删除旧的枚举类型并重建
-- 注意：必须先将列类型改为 varchar，才能删除枚举类型
ALTER TABLE bugs
  ALTER COLUMN status TYPE varchar(20);

-- 删除旧枚举类型
DROP TYPE IF EXISTS bugs_status_enum CASCADE;

-- 创建新的大写枚举类型
CREATE TYPE bugs_status_enum AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
  'REOPENED'
);

-- Step 4: 将列类型改回枚举
ALTER TABLE bugs
  ALTER COLUMN status TYPE bugs_status_enum
  USING status::bugs_status_enum;

-- Step 5: 验证修复结果
DO $$
BEGIN
  RAISE NOTICE '修复后 bugs 表中的状态分布:';
END $$;

SELECT status, COUNT(*) as count
FROM bugs
GROUP BY status
ORDER BY status;

-- Step 6: 验证是否还有无效数据
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM bugs
  WHERE status NOT IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED', 'REOPENED');

  IF invalid_count > 0 THEN
    RAISE WARNING '发现 % 条无效状态数据，请手动检查', invalid_count;
  ELSE
    RAISE NOTICE '所有状态数据均已成功迁移';
  END IF;
END $$;
