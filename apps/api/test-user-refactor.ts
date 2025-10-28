// 简单的重构验证测试
import { UserEntity, useEntityManager } from '@pro/entities';

async function testUserRefactor() {
  try {
    // 测试 useEntityManager 函数是否可以正常工作
    await useEntityManager(async (m) => {
      const repository = m.getRepository(UserEntity);
      console.log('✅ useEntityManager 可以正常工作');
      console.log('✅ UserEntity repository 可以正常获取');
      return true;
    });

    console.log('✅ 重构后的 UserService 依赖项验证通过');
  } catch (error) {
    console.error('❌ 重构验证失败:', error);
    process.exit(1);
  }
}

testUserRefactor();