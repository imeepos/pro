import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MENU_ITEMS, MenuItem } from '../../../config/menu.config';
import { LayoutStateService } from '../../../services/layout-state.service';
import { MenuItemComponent } from './menu-item/menu-item.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, MenuItemComponent],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
  @Input() collapsed: boolean = false;

  readonly menuItems = MENU_ITEMS;
  readonly expandedMenus$: Observable<Set<string>>;

  constructor(private layoutState: LayoutStateService) {
    this.expandedMenus$ = this.layoutState.expandedMenus$;
  }

  toggleMenu(menuId: string): void {
    this.layoutState.toggleMenu(menuId);
  }

  trackByMenuId(_index: number, item: MenuItem): string {
    return item.id;
  }
}
