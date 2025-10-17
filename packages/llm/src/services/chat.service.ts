import OpenAI from 'openai';
import type { ChatMessage, ChatOptions, ChatResponse, StreamChunk, FinishReason } from '../types';
import { LLMError } from '../errors/llm.error';

const allowedFinishReasons: ReadonlySet<Exclude<FinishReason, null>> = new Set([
  'stop',
  'length',
  'content_filter',
  'tool_calls',
  'function_call',
]);

const normalizeFinishReason = (reason: FinishReason | undefined): FinishReason => {
  if (reason === null || reason === undefined) {
    return null;
  }

  return allowedFinishReasons.has(reason) ? reason : null;
};

export class ChatService {
  constructor(
    private readonly client: OpenAI,
    private readonly defaultModel: string = 'gpt-4o-mini',
  ) {}

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<ChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        user: options.user,
        stream: false,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw LLMError.streamError('No content in response');
      }

      return {
        content: choice.message.content,
        role: 'assistant',
        finishReason: normalizeFinishReason(choice.finish_reason ?? null),
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error: any) {
      throw LLMError.fromOpenAIError(error);
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        user: options.user,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        fullContent += delta;

        yield {
          content: fullContent,
          delta,
          finishReason: normalizeFinishReason(chunk.choices[0]?.finish_reason ?? null),
        };
      }
    } catch (error: any) {
      throw LLMError.fromOpenAIError(error);
    }
  }
}
