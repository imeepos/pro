import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'sentiment-chat-message',
  standalone: true,
  imports: [CommonModule, NzTagModule, NzIconModule],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss']
})
export class ChatMessageComponent {
  private readonly datePipe = inject(DatePipe);

  @Input({ required: true }) message!: ChatMessage;

  readonly positionClass = computed(() =>
    this.message.author === 'analyst' ? 'message--right' : 'message--left'
  );

  formatTimestamp(timestamp: Date): string {
    return this.datePipe.transform(timestamp, 'MM-dd HH:mm') ?? '';
  }

  isStreaming(): boolean {
    return this.message.status === 'draft' || this.message.status === 'streaming';
  }

  isFailed(): boolean {
    return this.message.status === 'failed';
  }
}
