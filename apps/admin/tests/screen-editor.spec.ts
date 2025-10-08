import { test, expect } from '@playwright/test';

test('屏幕编辑器页面布局截图', async ({ page }) => {
  // 访问屏幕编辑器页面
  await page.goto('/screens/editor/6014a375-a2f7-42e9-ba7b-ca4853243524');

  // 等待页面加载完成
  await page.waitForLoadState('networkidle');

  // 等待关键元素加载
  await page.waitForSelector('.main-layout', { timeout: 10000 });

  // 等待一秒钟确保所有动画和样式都应用完成
  await page.waitForTimeout(1000);

  // 截取全页面截图
  await page.screenshot({
    path: 'screen-editor-full.png',
    fullPage: true
  });

  // 截取视口截图
  await page.screenshot({
    path: 'screen-editor-viewport.png',
    fullPage: false
  });

  // 检查关键元素是否存在
  await expect(page.locator('.toolbar')).toBeVisible();
  await expect(page.locator('.left-panel')).toBeVisible();
  await expect(page.locator('.canvas-container')).toBeVisible();
  await expect(page.locator('.right-panel')).toBeVisible();

  console.log('屏幕编辑器页面截图完成！');
});