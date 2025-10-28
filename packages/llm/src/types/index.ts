import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';

export type ChatMessage = ChatCompletionMessageParam;
export type FinishReason = ChatCompletion.Choice['finish_reason'];

export interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  user?: string;
}

export interface ChatResponse {
  content: string;
  role: 'assistant';
  finishReason: FinishReason;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  content: string;
  delta: string;
  finishReason: FinishReason;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  user?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}
