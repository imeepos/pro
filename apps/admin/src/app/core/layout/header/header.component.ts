import { Component } from '@angular/core';
import { UserInfoComponent } from './user-info/user-info.component';
import { NotificationComponent } from './notification/notification.component';
import { LogoComponent } from '../sidebar/logo/logo.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [UserInfoComponent, NotificationComponent, LogoComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor() {
    console.log('HeaderComponent 构造函数执行成功');
  }
}
