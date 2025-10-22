import { AnalyzerContext, ChatAttachmentMeta, VisualizationDescriptor } from '../types/sentiment-analyzer.types';

export type ChatAuthor = 'analyst' | 'system' | 'assistant';

export type ChatMessageStatus = 'draft' | 'streaming' | 'delivered' | 'failed';

export type ChatContentKind = 'text' | 'analysis' | 'visualization' | 'attachment';

interface BaseChatContent {
  readonly kind: ChatContentKind;
}

export interface TextChatContent extends BaseChatContent {
  readonly kind: 'text';
  readonly text: string;
}

export interface AnalysisChatContent extends BaseChatContent {
  readonly kind: 'analysis';
  readonly headline: string;
  readonly insights: readonly string[];
}

export interface VisualizationChatContent extends BaseChatContent {
  readonly kind: 'visualization';
  readonly visualization: VisualizationDescriptor;
}

export interface AttachmentChatContent extends BaseChatContent {
  readonly kind: 'attachment';
  readonly attachment: ChatAttachmentMeta;
}

export type ChatContent =
  | TextChatContent
  | AnalysisChatContent
  | VisualizationChatContent
  | AttachmentChatContent;

export interface ChatMessage {
  readonly id: string;
  readonly author: ChatAuthor;
  readonly emittedAt: Date;
  readonly context?: AnalyzerContext;
  readonly status: ChatMessageStatus;
  readonly content: ChatContent;
  readonly correlationId?: string;
}
