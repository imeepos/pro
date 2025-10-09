import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem } from '../../../../config/menu.config';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss']
})
export class MenuItemComponent {
  @Input() item!: MenuItem;
  @Input() collapsed: boolean = false;

  expanded = signal(false);

  constructor(private router: Router) {}

  get isActive(): boolean {
    if (!this.item.route) return false;
    return this.router.url === this.item.route || this.router.url.startsWith(this.item.route + '/');
  }

  get hasChildren(): boolean {
    return !!this.item.children && this.item.children.length > 0;
  }

  handleClick(): void {
    if (this.hasChildren) {
      this.expanded.update(v => !v);
    } else if (this.item.route) {
      this.router.navigate([this.item.route]);
    }
  }

  navigateToChild(childRoute: string): void {
    this.router.navigate([childRoute]);
  }

  isChildActive(childRoute?: string): boolean {
    if (!childRoute) return false;
    // 精确匹配：只匹配完全相同的路由，避免 /events 误匹配 /events/event-types
    return this.router.url === childRoute;
  }
}
