import OpenAI from 'openai';
import type { EmbeddingOptions, EmbeddingResponse, BatchEmbeddingResponse } from '../types';
import { LLMError } from '../errors/llm.error';

export class EmbeddingService {
  constructor(
    private readonly client: OpenAI,
    private readonly defaultModel: string = 'text-embedding-3-small',
  ) {}

  async embed(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResponse> {
    try {
      const response = await this.client.embeddings.create({
        model: options.model || this.defaultModel,
        input: text,
        dimensions: options.dimensions,
        user: options.user,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw LLMError.streamError('No embedding in response');
      }

      return {
        embedding,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error: any) {
      throw LLMError.fromOpenAIError(error);
    }
  }

  async embedBatch(
    texts: string[],
    options: EmbeddingOptions = {},
  ): Promise<BatchEmbeddingResponse> {
    try {
      const response = await this.client.embeddings.create({
        model: options.model || this.defaultModel,
        input: texts,
        dimensions: options.dimensions,
        user: options.user,
      });

      const embeddings = response.data.map((item) => item.embedding);
      if (embeddings.length !== texts.length) {
        throw LLMError.streamError('Embedding count mismatch');
      }

      return {
        embeddings,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error: any) {
      throw LLMError.fromOpenAIError(error);
    }
  }
}
