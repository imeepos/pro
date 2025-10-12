import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ComponentRegistryService, WeiboLoggedInUsersCardComponent } from '@pro/components';
import { SkerSDK } from '@pro/sdk';
import { TokenStorageService } from './core/services/token-storage.service';
import { HttpClientService } from './core/services/http-client.service';
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
    }
  ]
};
