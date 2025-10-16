import { request } from '@playwright/test';

export default async function globalSetup() {
  const apiBase = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
  const requestContext = await request.newContext({
    baseURL: apiBase,
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    }
  });

  try {
    const response = await requestContext.post('/graphql', {
      data: {
        query: `
          mutation EnsureScreens {
            ensureTestScreens {
              id
              name
            }
          }
        `
      }
    });

    if (!response.ok()) {
      console.warn('[playwright] ensure screens mutation failed', await response.text());
    }
  } catch (error) {
    console.warn('[playwright] ensure screens skipped', error);
  } finally {
    await requestContext.dispose();
  }
}
