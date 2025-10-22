import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { SentimentChatService } from '../../services/sentiment-chat.service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { AnalyzerContext } from '../../types/sentiment-analyzer.types';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'sentiment-chat',
  standalone: true,
  imports: [CommonModule, NzIconModule, ChatMessageComponent, ChatInputComponent],
  templateUrl: './sentiment-chat.component.html',
  styleUrls: ['./sentiment-chat.component.scss']
})
export class SentimentChatComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly chatService = inject(SentimentChatService);

  @Input({ required: true }) context!: AnalyzerContext;
  @Output() busyChange = new EventEmitter<boolean>();
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  readonly messages$ = this.chatService.messages$;
  readonly busy = signal(false);
  readonly loadingHistory = signal(true);
  private readonly busyWatcher = effect(() => this.busyChange.emit(this.busy()));

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['context'] && this.context) {
      await this.initializeConversation();
    }
  }

  ngAfterViewInit(): void {
    this.messages$.pipe(takeUntilDestroyed()).subscribe(() => this.scrollToBottom());
  }

  ngOnDestroy(): void {
    this.chatService.reset();
    this.chatService.disconnect();
  }

  async handleSend(text: string): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    try {
      await this.chatService.sendTextMessage(text, this.context);
    } finally {
      this.busy.set(false);
    }
  }

  async handleUpload(file: File): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    try {
      await this.chatService.uploadEvidence(file, this.context);
    } finally {
      this.busy.set(false);
    }
  }

  private async initializeConversation(): Promise<void> {
    this.loadingHistory.set(true);
    const hasScope = Boolean(this.context.eventId || this.context.topic);
    if (!hasScope) {
      this.chatService.reset();
      this.loadingHistory.set(false);
      return;
    }
    const realtimeUrl = this.createRealtimeUrl();
    this.chatService.connectRealtime(realtimeUrl);
    await this.chatService.hydrateHistory(this.context);
    this.loadingHistory.set(false);
  }

  private createRealtimeUrl(): string {
    const base = new URL('/sentiment/chat/stream', this.chatService.baseApiUrl);
    const params = base.searchParams;

    if (this.context.eventId) {
      params.set('eventId', this.context.eventId);
    }
    if (this.context.topic) {
      params.set('topic', this.context.topic);
    }
    params.set('perspective', this.context.perspective);

    base.protocol = base.protocol.replace('http', 'ws');
    return base.toString();
  }

  private scrollToBottom(): void {
    const element = this.scrollContainer?.nativeElement;
    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    });
  }
}
