import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ComponentRegistryService, WeiboLoggedInUsersCardComponent, WebSocketManager, WebSocketService, JwtAuthService } from '@pro/components';
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
    registry.register(
      {
        type: 'weibo-logged-in-users-card',
        name: '微博已登录用户统计',
        icon: 'users',
        category: 'weibo'
      },
      WeiboLoggedInUsersCardComponent
    );

    // 注册测试组件
    registry.register(
      {
        type: 'test-simple',
        name: '测试组件',
        icon: 'test',
        category: 'test'
      },
      TestSimpleComponent
    );
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
        console.log('WebSocket Manager 初始化配置:');
        console.log('- wsUrl:', environment.wsUrl);
        console.log('- namespace:', environment.wsNamespace);

        const wsManager = new WebSocketManager(() => new WebSocketService(authService));
        // 预配置默认连接
        wsManager.connectToNamespace({
          url: baseUrl,
          namespace,
          auth: {
            token: localStorage.getItem(environment.tokenKey) || undefined,
            autoRefresh: true
          }
        });

        return wsManager;
      },
      deps: [JwtAuthService]
    }
  ]
};
