import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  handler: () => void;
  disabled?: boolean;
  divider?: boolean;
}

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent {
  @Input() items: MenuItem[] = [];
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Output() closed = new EventEmitter<void>();

  get position() {
    return {
      left: `${this.x}px`,
      top: `${this.y}px`
    };
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:contextmenu', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.close();
  }

  @HostListener('click', ['$event'])
  onMenuClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  handleItemClick(item: MenuItem, event: MouseEvent): void {
    event.stopPropagation();
    if (item.disabled || item.divider) {
      return;
    }
    item.handler();
    this.close();
  }

  close(): void {
    this.closed.emit();
  }
}
