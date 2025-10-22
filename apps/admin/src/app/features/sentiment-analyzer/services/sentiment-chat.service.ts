import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ChatAuthor,
  ChatContent,
  ChatMessage,
  ChatMessageStatus
} from '../models/chat-message.model';
import { AnalyzerContext, ChatAttachmentMeta } from '../types/sentiment-analyzer.types';
import { WebsocketService } from './websocket.service';

type ChatMessageDto = Omit<ChatMessage, 'emittedAt'> & { emittedAt: string };

interface SendMessagePayload {
  readonly text?: string;
  readonly attachmentId?: string;
  readonly context: AnalyzerContext;
}

@Injectable({
  providedIn: 'root'
})
export class SentimentChatService {
  private readonly http = inject(HttpClient);
  private readonly websocket = inject(WebsocketService);
  readonly baseApiUrl = environment.apiUrl;
  private readonly endpoint = `${this.baseApiUrl}/sentiment/chat`;
  private readonly messagesSubject = new BehaviorSubject<ChatMessage[]>([]);

  readonly messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();

  constructor() {
    this.websocket.listen<ChatMessageDto>('sentiment.chat.message').subscribe({
      next: (payload) => this.mergeIncomingMessage(payload)
    });
  }

  connectRealtime(channelUrl: string): void {
    this.websocket.connect(channelUrl);
  }

  disconnect(): void {
    this.websocket.disconnect();
  }

  async hydrateHistory(context: AnalyzerContext): Promise<void> {
    const records = await firstValueFrom(
      this.http.post<ChatMessageDto[]>(`${this.endpoint}/history`, context)
    );
    this.messagesSubject.next(records.map((record) => this.toChatMessage(record)));
  }

  async sendTextMessage(text: string, context: AnalyzerContext): Promise<void> {
    if (!text.trim()) {
      return;
    }

    const draft = this.createOptimisticMessage(
      {
        kind: 'text',
        text: text.trim()
      },
      context
    );
    this.stageMessage(draft);

    try {
      const dto = await firstValueFrom(
        this.http.post<ChatMessageDto>(`${this.endpoint}/messages`, this.createPayload({ text }, context))
      );
      this.replaceMessage(draft.id, this.toChatMessage(dto));
    } catch (error) {
      this.markAsFailed(draft.id);
      throw error;
    }
  }

  async sendAttachment(attachment: ChatAttachmentMeta, context: AnalyzerContext): Promise<void> {
    const draft = this.createOptimisticMessage(
      {
        kind: 'attachment',
        attachment
      },
      context
    );
    this.stageMessage(draft);

    try {
      const dto = await firstValueFrom(
        this.http.post<ChatMessageDto>(
          `${this.endpoint}/messages`,
          this.createPayload({ attachmentId: attachment.url }, context)
        )
      );
      this.replaceMessage(draft.id, this.toChatMessage(dto));
    } catch (error) {
      this.markAsFailed(draft.id);
      throw error;
    }
  }

  async uploadEvidence(file: File, context: AnalyzerContext): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const meta = await firstValueFrom(
      this.http.post<ChatAttachmentMeta>(`${this.endpoint}/uploads`, formData)
    );

    await this.sendAttachment(meta, context);
  }

  reset(): void {
    this.messagesSubject.next([]);
  }

  private createPayload(seed: Partial<SendMessagePayload>, context: AnalyzerContext): SendMessagePayload {
    return {
      text: seed.text?.trim(),
      attachmentId: seed.attachmentId,
      context
    };
  }

  private createOptimisticMessage(content: ChatContent, context: AnalyzerContext): ChatMessage {
    return {
      id: this.createMessageId(),
      author: 'analyst',
      emittedAt: new Date(),
      status: 'draft',
      content,
      context
    };
  }

  private stageMessage(message: ChatMessage): void {
    const current = this.messagesSubject.value;
    this.messagesSubject.next([...current, message]);
  }

  private replaceMessage(id: string, message: ChatMessage): void {
    const current = this.messagesSubject.value;
    const next = current.map((item) => (item.id === id ? message : item));
    this.messagesSubject.next(next);
  }

  private markAsFailed(id: string): void {
    const current = this.messagesSubject.value;
    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            status: 'failed' as ChatMessageStatus
          }
        : item
    );
    this.messagesSubject.next(next);
  }

  private mergeIncomingMessage(dto: ChatMessageDto): void {
    const incoming = this.toChatMessage(dto);
    const existing = this.messagesSubject.value;
    const hasMessage = existing.some((message) => message.id === incoming.id);
    if (hasMessage) {
      this.replaceMessage(incoming.id, incoming);
    } else {
      this.messagesSubject.next([...existing, incoming]);
    }
  }

  private toChatMessage(dto: ChatMessageDto): ChatMessage {
    return {
      ...dto,
      emittedAt: new Date(dto.emittedAt)
    };
  }

  private createMessageId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
