import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ComponentRegistryService, WeiboLoggedInUsersCardComponent, WebSocketManager, WebSocketService, JwtAuthService, createScreensWebSocketConfig, createNotificationWebSocketConfig } from '@pro/components';
import { TestSimpleComponent } from './features/screens/components/test-simple.component';
import { EventsStore } from './state/events.store';
import { TagsStore } from './state/tags.store';
import { UserService } from './state/user.service';
import { TokenStorageService } from './core/services/token-storage.service';
import { HttpClientService } from './core/services/http-client.service';
import { SkerSDK } from '@pro/sdk';
import { environment } from '../environments/environment';

function initializeComponentRegistry(registry: ComponentRegistryService) {
  return () => {
    console.log('[App] 组件注册开始');

    try {
      console.log('[App] 注册 weibo-logged-in-users-card 组件');
      registry.register(
        {
          type: 'weibo-logged-in-users-card',
          name: '微博已登录用户统计',
          icon: 'users',
          category: 'weibo'
        },
        WeiboLoggedInUsersCardComponent
      );
      console.log('[App] weibo-logged-in-users-card 组件注册成功');

      // 注册测试组件
      console.log('[App] 注册 test-simple 组件');
      registry.register(
        {
          type: 'test-simple',
          name: '测试组件',
          icon: 'test',
          category: 'test'
        },
        TestSimpleComponent
      );
      console.log('[App] test-simple 组件注册成功');

      // 验证注册结果
      const registeredComponents = registry.getAll();
      console.log('[App] 组件注册完成', {
        totalComponents: registeredComponents.length,
        componentTypes: registeredComponents.map(c => c.type)
      });

      // 验证特定组件
      const weiboComponent = registry.get('weibo-logged-in-users-card');
      console.log('[App] weibo-logged-in-users-card 验证', {
        isRegistered: !!weiboComponent,
        componentName: weiboComponent?.name
      });

    } catch (error) {
      console.error('[App] 组件注册失败', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([tokenInterceptor, errorInterceptor])
    ),
    provideAnimations(),
    // FormBuilder 依赖 ReactiveFormsModule 中的 providers
    ComponentRegistryService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeComponentRegistry,
      deps: [ComponentRegistryService],
      multi: true
    },
    // Akita stores
    EventsStore,
    TagsStore,
    // Services
    UserService,
    TokenStorageService,
    HttpClientService,
    // Token Storage injection for components
    {
      provide: 'ITokenStorage',
      useExisting: TokenStorageService
    },
    // SDK
    {
      provide: SkerSDK,
      useFactory: () => {
        const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
        console.log('SDK 初始化配置:');
        console.log('- 原始 apiUrl:', environment.apiUrl);
        console.log('- 处理后 baseUrl:', baseUrl);
        console.log('- tokenKey:', environment.tokenKey);
        return new SkerSDK(baseUrl, environment.tokenKey);
      }
    },
    // WebSocket Auth Service
    JwtAuthService,
    // WebSocket
    {
      provide: WebSocketManager,
      useFactory: (authService: JwtAuthService) => {
        const baseUrl = environment.wsUrl;
        const namespace = environment.wsNamespace;
        const token = localStorage.getItem(environment.tokenKey) || undefined;

        console.log('WebSocket Manager 初始化配置:');
        console.log('- wsUrl:', environment.wsUrl);
        console.log('- namespace:', environment.wsNamespace);

        const wsManager = new WebSocketManager(() => new WebSocketService(authService));

        // 预配置screens连接
        const screensConfig = createScreensWebSocketConfig(baseUrl, token);
        wsManager.connectToNamespace(screensConfig);

        // 预配置notifications连接
        const notificationsConfig = createNotificationWebSocketConfig(baseUrl, token);
        wsManager.connectToNamespace(notificationsConfig);

        return wsManager;
      },
      deps: [JwtAuthService]
    }
  ]
};
