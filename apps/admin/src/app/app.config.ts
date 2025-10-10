import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ComponentRegistryService, WeiboLoggedInUsersCardComponent } from '@pro/components';
import { TestSimpleComponent } from './features/screens/components/test-simple.component';
import { EventsStore } from './state/events.store';
import { TagsStore } from './state/tags.store';
import { UserService } from './state/user.service';
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
    // SDK
    {
      provide: SkerSDK,
      useFactory: () => new SkerSDK(environment.apiUrl)
    }
  ]
};
