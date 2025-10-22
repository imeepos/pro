import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { FloatingChatButtonComponent } from './components/floating-chat-button/floating-chat-button.component';
import { SentimentChatComponent } from './components/sentiment-chat/sentiment-chat.component';
import { AnalysisPanelComponent } from './components/analysis-panel/analysis-panel.component';
import { AnalyzerContext } from './types/sentiment-analyzer.types';
import { SentimentChatService } from './services/sentiment-chat.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'sentiment-analyzer-widget',
  standalone: true,
  imports: [CommonModule, DragDropModule, FloatingChatButtonComponent, SentimentChatComponent, AnalysisPanelComponent],
  templateUrl: './sentiment-analyzer.component.html',
  styleUrls: ['./sentiment-analyzer.component.scss']
})
export class SentimentAnalyzerComponent {
  private readonly chatService = inject(SentimentChatService);

  readonly open = signal(false);
  readonly chatBusy = signal(false);
  readonly unreadCount = signal(0);
  readonly dragPosition = signal({ x: 0, y: 0 });

  readonly context = signal<AnalyzerContext>({
    perspective: 'public-opinion'
  });

  private lastMessageCount = 0;

  constructor() {
    this.chatService.messages$.pipe(takeUntilDestroyed()).subscribe((messages) => {
      if (messages.length > this.lastMessageCount) {
        const latest = messages[messages.length - 1];
        if (!this.open() && latest.author !== 'analyst') {
          this.unreadCount.update((count) => count + 1);
        }
      }
      this.lastMessageCount = messages.length;
    });
  }

  toggleWindow(active: boolean): void {
    this.open.set(active);
    if (active) {
      this.unreadCount.set(0);
    }
  }

  updateBusyState(busy: boolean): void {
    this.chatBusy.set(busy);
  }

  onDragEnd(event: CdkDragEnd): void {
    const position = event.source.getFreeDragPosition();
    this.dragPosition.set(position);
  }

  close(): void {
    this.open.set(false);
  }
}
