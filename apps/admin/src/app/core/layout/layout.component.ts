import { Component, HostListener } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MainContentComponent } from './main-content/main-content.component';
import { LayoutStateService } from '../services/layout-state.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, MainContentComponent],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  constructor(private layoutState: LayoutStateService) {}

  // 添加键盘快捷键支持：Ctrl+B 或 Cmd+B 切换侧边栏
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ctrl+B (Windows/Linux) 或 Cmd+B (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault();
      this.layoutState.toggleSidebar();
    }
  }
}
