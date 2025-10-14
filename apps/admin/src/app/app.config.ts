import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ComponentRegistryService, WeiboLoggedInUsersCardComponent, WebSocketManager, WebSocketService, JwtAuthService, createScreensWebSocketConfig, createNotificationWebSocketConfig } from '@pro/components';
import { TestSimpleComponent } from './features/screens/components/test-simple.component';
import { TokenStorageService } from './core/services/token-storage.service';
import { AuthService } from './state/auth.service';
import { SkerSDK } from '@pro/sdk';
import { environment } from '../environments/environment';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { zh_CN, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzConfig } from 'ng-zorro-antd/core/config';
import { NZ_DATE_LOCALE, en_US } from 'ng-zorro-antd/i18n';
import { DatePipe } from '@angular/common';
import { SafeDatePipe } from './shared/pipes/safe-date.pipe';
import { registerLocaleData } from '@angular/common';
import localeZhHans from '@angular/common/locales/zh-Hans';
import * as AllIcons from '@ant-design/icons-angular/icons';

// 确保中文本地化数据已注册
registerLocaleData(localeZhHans, 'zh-CN');

// 创建包含完整 localize 属性的中文本地化配置
const customZhCNLocale = {
  ...zh_CN,
  localize: {
    ...localeZhHans[0]?.localize || {},
    // 确保日期本地化属性存在
    era: localeZhHans[0]?.localize?.era || {},
    year: localeZhHans[0]?.localize?.year || {},
    month: localeZhHans[0]?.localize?.month || {},
    weekday: localeZhHans[0]?.localize?.weekday || {},
    dayPeriod: localeZhHans[0]?.localize?.dayPeriod || {},
    dateFormat: {
      medium: 'y年M月d日 AH:mm:ss',
      short: 'y/M/d AH:mm',
      fullDate: 'y年M月d日EEEE',
      longDate: 'y年M月d日',
      mediumDate: 'y年M月d日',
      shortDate: 'y/M/d',
      mediumTime: 'AH:mm:ss',
      shortTime: 'AH:mm'
    }
  }
};

function initializeComponentRegistry(registry: ComponentRegistryService) {
  return () => {
    try {
      const components = [
        {
          definition: {
            type: 'weibo-logged-in-users-card',
            name: '微博已登录用户统计',
            icon: 'users',
            category: 'weibo'
          },
          component: WeiboLoggedInUsersCardComponent
        },
        {
          definition: {
            type: 'test-simple',
            name: '测试组件',
            icon: 'test',
            category: 'test'
          },
          component: TestSimpleComponent
        }
      ];

      components.forEach(({ definition, component }) => {
        registry.register(definition, component);
      });

      const registeredCount = registry.getAll().length;
      console.log(`[App] 成功注册${registeredCount}个组件`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[App] 组件注册失败: ${errorMessage}`);
      throw error;
    }
  };
}

function initializeAuth(authService: AuthService) {
  return () => {
    return authService.restoreAuthSession().toPromise();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 核心 providers
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
    provideAnimations(),

    // ng-zorro-antd 配置
    provideNzI18n(zh_CN),
    provideNzIcons(Object.values(AllIcons).filter((icon): icon is any => typeof icon === 'object')),

    // 安全的日期格式配置
    {
      provide: DatePipe,
      useClass: SafeDatePipe
    },

    // ng-zorro-antd 日期本地化配置 - 使用包含完整 localize 属性的自定义本地化对象
    {
      provide: NZ_DATE_LOCALE,
      useValue: customZhCNLocale
    },

    // Token存储服务的接口适配
    {
      provide: 'ITokenStorage',
      useExisting: TokenStorageService
    },

    // SDK 配置
    {
      provide: SkerSDK,
      useFactory: () => {
        const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
        return new SkerSDK(baseUrl, environment.tokenKey);
      }
    },

    // 组件注册服务
    ComponentRegistryService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeComponentRegistry,
      deps: [ComponentRegistryService],
      multi: true
    },

    // 认证状态初始化
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true
    },

    // WebSocket 认证服务
    JwtAuthService,

    // WebSocket 管理器
    {
      provide: WebSocketManager,
      useFactory: (authService: JwtAuthService) => {
        try {
          const wsManager = new WebSocketManager(() => new WebSocketService(authService));

          const token = localStorage.getItem(environment.tokenKey);
          if (token) {
            const screensConfig = createScreensWebSocketConfig(environment.wsUrl, token);
            const notificationsConfig = createNotificationWebSocketConfig(environment.wsUrl, token);

            wsManager.connectToNamespace(screensConfig);
            wsManager.connectToNamespace(notificationsConfig);
          }

          return wsManager;
        } catch (error) {
          console.warn('[App] WebSocket初始化失败，将在后续需要时重试', error);
          return new WebSocketManager(() => new WebSocketService(authService));
        }
      },
      deps: [JwtAuthService]
    }
  ]
};
