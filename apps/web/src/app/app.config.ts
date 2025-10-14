import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ComponentRegistryService, WeiboLoggedInUsersCardComponent, EventMapDistributionComponent, WebSocketManager, WebSocketService, JwtAuthService, createScreensWebSocketConfig } from '@pro/components';
import { SkerSDK } from '@pro/sdk';
import { TokenStorageService } from './core/services/token-storage.service';
import { HttpClientService } from './core/services/http-client.service';
import { AuthStateService } from './core/state/auth-state.service';
import { environment } from '../environments/environment';

function initializeComponentRegistry(registry: ComponentRegistryService) {
  return () => {
    console.log('[APP_INITIALIZER] 开始注册组件');

    return new Promise<void>((resolve, reject) => {
      try {
        // 延迟一点时间确保所有模块都加载完成
        setTimeout(() => {
          try {
            console.log('[APP_INITIALIZER] 开始注册 weibo-logged-in-users-card 组件');

            registry.register(
              {
                type: 'weibo-logged-in-users-card',
                name: '微博已登录用户统计',
                icon: 'users',
                category: 'weibo'
              },
              WeiboLoggedInUsersCardComponent
            );

            console.log('[APP_INITIALIZER] weibo-logged-in-users-card 组件注册成功');

            registry.register(
              {
                type: 'event-map-distribution',
                name: '事件地图分布',
                icon: 'compass',
                category: 'events'
              },
              EventMapDistributionComponent
            );

            console.log('[APP_INITIALIZER] event-map-distribution 组件注册成功');

            // 验证注册是否成功
            const registeredComponent = registry.get('weibo-logged-in-users-card');
            if (!registeredComponent) {
              console.error('[APP_INITIALIZER] 组件注册验证失败');
              reject(new Error('组件注册验证失败'));
              return;
            }

            console.log('[APP_INITIALIZER] 组件注册验证成功', {
              componentType: typeof registeredComponent,
              hasComponentDef: !!(registeredComponent as any).ɵcmp
            });

            const eventMapComponent = registry.get('event-map-distribution');
            if (!eventMapComponent) {
              console.error('[APP_INITIALIZER] event-map-distribution 注册验证失败');
              reject(new Error('event-map-distribution 组件注册验证失败'));
              return;
            }

            console.log('[APP_INITIALIZER] 所有组件注册完成');
            resolve();
          } catch (error) {
            console.error('[APP_INITIALIZER] 组件注册过程中发生错误', error);
            reject(error);
          }
        }, 100); // 100ms 延迟确保环境准备完成
      } catch (error) {
        console.error('[APP_INITIALIZER] 组件注册初始化失败', error);
        reject(error);
      }
    });
  };
}

function initializeAuth(authStateService: AuthStateService) {
  return () => {
    return authStateService.checkAuth().toPromise();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([tokenInterceptor, errorInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeComponentRegistry,
      deps: [ComponentRegistryService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthStateService],
      multi: true
    },
    // Services
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
        return new SkerSDK(baseUrl, environment.tokenKey);
      }
    },
    // WebSocket Auth Service
    JwtAuthService,
    // WebSocket
    {
      provide: WebSocketManager,
      useFactory: (authService: JwtAuthService) => {
        console.log('WebSocket Manager 初始化配置:');
        console.log('- wsUrl:', environment.wsUrl);
        console.log('- namespace:', environment.wsNamespace);

        const wsManager = new WebSocketManager(() => new WebSocketService(authService));

        // 预配置默认screens连接
        const token = localStorage.getItem(environment.tokenKey) || undefined;
        const screensConfig = createScreensWebSocketConfig(environment.wsUrl, token);
        wsManager.connectToNamespace(screensConfig);

        return wsManager;
      },
      deps: [JwtAuthService]
    }
  ]
};
