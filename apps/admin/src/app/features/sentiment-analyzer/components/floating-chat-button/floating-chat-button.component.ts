import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'sentiment-floating-chat-button',
  standalone: true,
  imports: [CommonModule, NzBadgeModule, NzIconModule],
  templateUrl: './floating-chat-button.component.html',
  styleUrls: ['./floating-chat-button.component.scss']
})
export class FloatingChatButtonComponent {
  @Input() active = false;
  @Input() busy = false;
  @Input() unreadCount = 0;
  @Output() toggled = new EventEmitter<boolean>();

  onToggle(): void {
    this.toggled.emit(!this.active);
  }
}
