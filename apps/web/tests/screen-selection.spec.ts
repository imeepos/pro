import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env['WEB_BASE_URL'] ?? 'http://localhost:4200';

async function waitForToolbar(page: Page) {
  await expect(page.locator('[data-testid="screen-selector"] select')).toBeVisible({ timeout: 30_000 });
}

test.describe('Screen selection flow', () => {
  test('shares manual selection between home and display', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await waitForToolbar(page);

    const selector = page.locator('[data-testid="screen-selector"] select');
    const optionCount = await selector.locator('option').count();
    test.skip(optionCount < 2, 'Need at least two screens to exercise selection flow');

    await selector.selectOption({ index: 1 });
    await expect(selector).toHaveValue('1');

    await page.goto(`${BASE_URL}/screen`);
    await waitForToolbar(page);
    await expect(page.locator('[data-testid="screen-selector"] select')).toHaveValue('1');

    await page.goto(`${BASE_URL}/home`);
    await waitForToolbar(page);

    await selector.selectOption({ index: 0 });
    await expect(selector).toHaveValue('0');

    await page.goto(`${BASE_URL}/screen`);
    await waitForToolbar(page);
    await expect(page.locator('[data-testid="screen-selector"] select')).toHaveValue('0');
  });
});
