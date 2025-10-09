import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserInfoComponent } from './user-info/user-info.component';
import { NotificationComponent } from './notification/notification.component';
import { LogoComponent } from '../sidebar/logo/logo.component';
import { LayoutStateService } from '../../services/layout-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, UserInfoComponent, NotificationComponent, LogoComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private readonly layoutState = inject(LayoutStateService);

  readonly collapsed$ = this.layoutState.collapsed$;

  constructor() {
    console.log('HeaderComponent 构造函数执行成功');
  }
}
