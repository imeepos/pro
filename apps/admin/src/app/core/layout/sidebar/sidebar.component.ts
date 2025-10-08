import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MenuComponent } from './menu/menu.component';
import { SidebarToggleComponent } from './sidebar-toggle/sidebar-toggle.component';
import { LayoutStateService } from '../../services/layout-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MenuComponent, SidebarToggleComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private readonly layoutState = inject(LayoutStateService);

  readonly collapsed$: Observable<boolean> = this.layoutState.collapsed$;

  constructor() {
    console.log('SidebarComponent 构造函数执行成功');
    console.log('LayoutStateService:', !!this.layoutState);
  }
}
