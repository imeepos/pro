import OpenAI from 'openai';
import type { LLMConfig } from './types';
import { LLMError } from './errors/llm.error';
import { ChatService } from './services/chat.service';
import { EmbeddingService } from './services/embedding.service';

export class LLMClient {
  private readonly openai: OpenAI;
  public readonly chat: ChatService;
  public readonly embedding: EmbeddingService;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw LLMError.invalidConfig('API key is required');
    }

    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      timeout: config.timeout,
      maxRetries: config.maxRetries ?? 2,
    });

    const defaultModel = config.defaultModel || 'gpt-4o-mini';
    this.chat = new ChatService(this.openai, defaultModel);
    this.embedding = new EmbeddingService(this.openai);
  }
}
