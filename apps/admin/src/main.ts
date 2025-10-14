import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeZhHans from '@angular/common/locales/zh-Hans';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

registerLocaleData(localeZhHans, 'zh-CN');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
