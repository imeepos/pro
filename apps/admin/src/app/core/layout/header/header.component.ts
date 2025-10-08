import { Component } from '@angular/core';
import { UserInfoComponent } from './user-info/user-info.component';
import { NotificationComponent } from './notification/notification.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [UserInfoComponent, NotificationComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor() {
    console.log('HeaderComponent 构造函数执行成功');
  }
}
