import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MenuItem } from '../../../../config/menu.config';

@Component({
  selector: 'app-sub-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sub-menu.component.html',
  styleUrls: ['./sub-menu.component.scss'],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({
        height: '0',
        opacity: '0',
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: '1',
        overflow: 'hidden'
      })),
      transition('collapsed <=> expanded', animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class SubMenuComponent {
  @Input() items!: MenuItem[];
  @Input() collapsed: boolean = false;
  @Input() expanded: boolean = false;

  constructor(private router: Router) {}

  get animationState(): string {
    return this.expanded && !this.collapsed ? 'expanded' : 'collapsed';
  }

  isChildActive(route?: string): boolean {
    if (!route) return false;
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  navigateToChild(route: string): void {
    this.router.navigate([route]);
  }
}
