import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Playwright } from './types';
export interface CookieData {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
export class PlaywrightExecutor {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    async execute(node: Playwright): Promise<string> {
        try {
            // 1. 初始化浏览器（支持复用）
            await this.initializeBrowser(node);
            // 2. 设置Cookies
            await this.setCookies(node);
            if (!this.page) throw new Error(`创建页面失败`)
            if (!node.url) throw new Error(`页面链接不能为空`)
            // 3. 访问页面
            await this.page.goto(node.url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            return await this.page.content();
        } finally {
            await this.close()
            console.log(`浏览器已关闭`)
        }
    }

    private async setCookies(node: Playwright): Promise<void> {
        if (!node.cookies || !this.context) return;
        try {
            // 1. 如果需要清除现有cookies
            await this.context.clearCookies();
            console.log('🧹 已清除现有cookies');

            // 2. 解析cookies数据
            let cookies: CookieData[] = [];

            if (typeof node.cookies === 'string') {
                // 从字符串解析cookies（支持格式："name1=value1; name2=value2"）
                cookies = this.parseCookieString(node.cookies);
            } else if (Array.isArray(node.cookies)) {
                // 直接使用CookieData数组
                cookies = node.cookies;
            }

            // 3. 设置cookies
            if (cookies.length > 0) {
                const playwrightCookies = cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || this.extractDomain(node.url!),
                    path: cookie.path || '/',
                    expires: cookie.expires,
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: cookie.sameSite || 'Lax'
                }));

                await this.context.addCookies(playwrightCookies);
                console.log(`✅ 成功设置 ${cookies.length} 个cookies`);
            }

        } catch (error) {
            console.error('❌ 设置cookies失败:', (error as Error).message);
        }
    }
    private parseCookieString(cookieString: string): CookieData[] {
        const cookies: CookieData[] = [];

        if (!cookieString.trim()) return cookies;

        // 解析 "name1=value1; name2=value2" 格式
        cookieString.split(';').forEach(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=');
            if (name && valueParts.length > 0) {
                cookies.push({
                    name: name.trim(),
                    value: valueParts.join('=').trim()
                });
            }
        });

        return cookies;
    }
    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return '';
        }
    }
    async close(): Promise<void> {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.context) {
            await this.context.close();
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
    private async initializeBrowser(node: Playwright): Promise<void> {
        // 创建新实例
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const userAgent = typeof node.ua === 'string' ? node.ua : undefined;

        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent,
        });

        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(30000);
    }
}