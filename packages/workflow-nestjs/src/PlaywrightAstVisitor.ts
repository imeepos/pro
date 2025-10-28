import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { PlaywrightAst, Handler } from '@pro/workflow-core';
import { Injectable } from '@pro/core';

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

@Handler(PlaywrightAst)
@Injectable()
export class PlaywrightAstVisitor {
    private static sharedBrowser: Browser | null = null;
    private static sharedContext: BrowserContext | null = null;
    private static isInitializing = false;

    private page: Page | null = null;

    async visit(node: PlaywrightAst): Promise<PlaywrightAst> {
        try {
            await this.ensureBrowserReady(node);
            await this.setCookies(node);

            if (!this.page) throw new Error(`创建页面失败`)
            if (!node.url) throw new Error(`页面链接不能为空`)

            await this.page.goto(node.url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            node.html = await this.page.content();
            node.state = 'success'
            return node;
        } finally {
            await this.closePage()
        }
    }

    private async setCookies(node: PlaywrightAst): Promise<void> {
        const context = PlaywrightAstVisitor.sharedContext;
        if (!node.cookies || !context) return;
        try {
            await context.clearCookies();
            // 2. 解析cookies数据
            let cookies: CookieData[] = [];

            if (typeof node.cookies === 'string') {
                // 从字符串解析cookies（支持格式："name1=value1; name2=value2"）
                cookies = this.parseCookieString(node.cookies);
            } else if (Array.isArray(node.cookies)) {
                // 直接使用CookieData数组
                cookies = node.cookies;
            }

            if (cookies.length > 0) {
                const playwrightCookies = cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || this.extractDomain(node.url!),
                    path: cookie.path || '/',
                    expires: cookie.expires!,
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: cookie.sameSite || 'Lax'
                }));

                await context.addCookies(playwrightCookies);
            }

        } catch (error) {
            console.error('设置cookies失败:', (error as Error).message);
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
    private async closePage(): Promise<void> {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
    }

    private async ensureBrowserReady(node: PlaywrightAst): Promise<void> {
        if (await this.isBrowserHealthy()) {
            await this.createPage();
            return;
        }

        while (PlaywrightAstVisitor.isInitializing) {
            await this.sleep(100);
        }

        if (await this.isBrowserHealthy()) {
            await this.createPage();
            return;
        }

        await this.initializeBrowser(node);
    }

    private async isBrowserHealthy(): Promise<boolean> {
        try {
            const browser = PlaywrightAstVisitor.sharedBrowser;
            const context = PlaywrightAstVisitor.sharedContext;

            if (!browser || !context) return false;

            return browser.isConnected();
        } catch {
            return false;
        }
    }

    private async initializeBrowser(node: PlaywrightAst): Promise<void> {
        PlaywrightAstVisitor.isInitializing = true;

        try {
            await this.cleanupSharedBrowser();

            PlaywrightAstVisitor.sharedBrowser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const userAgent = typeof node.ua === 'string' ? node.ua : '';

            PlaywrightAstVisitor.sharedContext = await PlaywrightAstVisitor.sharedBrowser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent,
            });

            await this.createPage();
        } finally {
            PlaywrightAstVisitor.isInitializing = false;
        }
    }

    private async createPage(): Promise<void> {
        const context = PlaywrightAstVisitor.sharedContext;
        if (!context) throw new Error('Browser context not initialized');

        this.page = await context.newPage();
        this.page.setDefaultTimeout(30000);
    }

    private async cleanupSharedBrowser(): Promise<void> {
        try {
            if (PlaywrightAstVisitor.sharedContext) {
                await PlaywrightAstVisitor.sharedContext.close();
                PlaywrightAstVisitor.sharedContext = null;
            }
            if (PlaywrightAstVisitor.sharedBrowser) {
                await PlaywrightAstVisitor.sharedBrowser.close();
                PlaywrightAstVisitor.sharedBrowser = null;
            }
        } catch (error) {
            console.error('清理浏览器失败:', (error as Error).message);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async cleanup(): Promise<void> {
        try {
            if (PlaywrightAstVisitor.sharedContext) {
                await PlaywrightAstVisitor.sharedContext.close();
                PlaywrightAstVisitor.sharedContext = null;
            }
            if (PlaywrightAstVisitor.sharedBrowser) {
                await PlaywrightAstVisitor.sharedBrowser.close();
                PlaywrightAstVisitor.sharedBrowser = null;
            }
        } catch (error) {
            console.error('全局浏览器清理失败:', (error as Error).message);
        }
    }
}
