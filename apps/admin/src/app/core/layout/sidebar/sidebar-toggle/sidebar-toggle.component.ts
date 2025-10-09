import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutStateService } from '../../../services/layout-state.service';

@Component({
  selector: 'app-sidebar-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-toggle.component.html'
})
export class SidebarToggleComponent {
  private readonly layoutState = inject(LayoutStateService);

  readonly collapsed$ = this.layoutState.collapsed$;

  toggle(): void {
    this.layoutState.toggleSidebar();
  }
}
