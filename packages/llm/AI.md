# @pro/llm

Elegant LLM toolkit with OpenAI SDK - a minimalist abstraction for AI operations.

## Purpose

A refined, purpose-driven wrapper around the OpenAI SDK that provides:
- Chat completions (streaming and non-streaming)
- Text embeddings (single and batch)
- Unified error handling
- Type-safe interfaces

## Architecture

```
@pro/llm/
├── src/
│   ├── client.ts              # LLMClient - unified entry point
│   ├── services/
│   │   ├── chat.service.ts    # ChatService - conversation operations
│   │   └── embedding.service.ts # EmbeddingService - vector operations
│   ├── errors/
│   │   └── llm.error.ts       # LLMError - structured error handling
│   ├── types/
│   │   └── index.ts           # Type definitions
│   └── index.ts               # Public API exports
```

## Core Exports

### Client
```typescript
import { LLMClient } from '@pro/llm';
```
**Location**: `/src/client.ts`
**Purpose**: Central client that orchestrates chat and embedding services

### Services
```typescript
import { ChatService, EmbeddingService } from '@pro/llm';
```
**Locations**:
- `/src/services/chat.service.ts`
- `/src/services/embedding.service.ts`

**Purpose**: Specialized services for chat and embedding operations

### Error Handling
```typescript
import { LLMError } from '@pro/llm';
```
**Location**: `/src/errors/llm.error.ts`
**Purpose**: Structured error representation with codes and details

### Types
```typescript
import type {
  LLMConfig,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  EmbeddingOptions,
  EmbeddingResponse,
  BatchEmbeddingResponse,
} from '@pro/llm';
```
**Location**: `/src/types/index.ts`
**Purpose**: Type-safe contracts for all operations

## LLM Provider Integration

### OpenAI (Primary)
- **SDK Version**: ^4.77.3
- **Default Chat Model**: `gpt-4o-mini`
- **Default Embedding Model**: `text-embedding-3-small`
- **Features**: Chat completions, streaming, embeddings, batch processing

## Usage Examples

### Initialize Client

```typescript
import { LLMClient } from '@pro/llm';

const llm = new LLMClient({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1', // optional
  organization: 'org-xxx', // optional
  defaultModel: 'gpt-4o-mini', // optional
  timeout: 60000, // optional, milliseconds
  maxRetries: 2, // optional, default: 2
});
```

### Chat Completion

```typescript
const response = await llm.chat.chat(
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing briefly.' },
  ],
  {
    model: 'gpt-4o-mini', // optional, uses default if not specified
    temperature: 0.7, // optional
    maxTokens: 500, // optional
    topP: 1, // optional
    frequencyPenalty: 0, // optional
    presencePenalty: 0, // optional
    user: 'user-123', // optional
  }
);

console.log(response.content);
console.log(response.usage); // token usage stats
```

### Streaming Chat

```typescript
const stream = llm.chat.chatStream([
  { role: 'user', content: 'Write a poem about code.' },
]);

for await (const chunk of stream) {
  process.stdout.write(chunk.delta); // incremental content

  if (chunk.finishReason === 'stop') {
    console.log('\n\nFull content:', chunk.content);
  }
}
```

### Single Embedding

```typescript
const result = await llm.embedding.embed(
  'The essence of elegant code lies in simplicity.',
  {
    model: 'text-embedding-3-small', // optional
    dimensions: 1536, // optional
    user: 'user-123', // optional
  }
);

console.log(result.embedding); // number[]
console.log(result.usage); // token usage
```

### Batch Embeddings

```typescript
const texts = [
  'First document to embed',
  'Second document to embed',
  'Third document to embed',
];

const result = await llm.embedding.embedBatch(texts, {
  model: 'text-embedding-3-large',
  dimensions: 3072,
});

console.log(result.embeddings); // number[][]
console.log(result.usage); // total token usage
```

### Error Handling

```typescript
import { LLMError } from '@pro/llm';

try {
  const response = await llm.chat.chat(messages);
} catch (error) {
  if (error instanceof LLMError) {
    console.error('Code:', error.code);
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Details:', error.details);

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      const retryAfter = error.details?.retryAfter;
      console.log(`Retry after ${retryAfter}s`);
    }
  }
  throw error;
}
```

## Quick Reference

### LLMClient Configuration
| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `apiKey` | string | Yes | - | OpenAI API key |
| `baseURL` | string | No | OpenAI default | Custom API endpoint |
| `organization` | string | No | - | OpenAI organization ID |
| `defaultModel` | string | No | 'gpt-4o-mini' | Default chat model |
| `timeout` | number | No | - | Request timeout (ms) |
| `maxRetries` | number | No | 2 | Max retry attempts |

### ChatOptions
| Property | Type | Description |
|----------|------|-------------|
| `model` | string | Override default model |
| `temperature` | number | 0-2, controls randomness |
| `maxTokens` | number | Maximum tokens to generate |
| `topP` | number | Nucleus sampling threshold |
| `frequencyPenalty` | number | -2 to 2, penalize repetition |
| `presencePenalty` | number | -2 to 2, encourage new topics |
| `user` | string | User identifier for tracking |

### EmbeddingOptions
| Property | Type | Description |
|----------|------|-------------|
| `model` | string | Override default embedding model |
| `dimensions` | number | Embedding vector dimensions |
| `user` | string | User identifier for tracking |

### Error Codes
| Code | Description |
|------|-------------|
| `INVALID_CONFIG` | Invalid client configuration |
| `RATE_LIMIT_EXCEEDED` | API rate limit hit |
| `TIMEOUT` | Request timeout |
| `STREAM_ERROR` | Streaming operation error |
| `UNKNOWN_ERROR` | Unmapped OpenAI error |

## Design Philosophy

This package embodies minimalist principles:

- **Necessity**: Every method serves an irreplaceable purpose
- **Clarity**: Type-safe interfaces that guide usage
- **Elegance**: Clean abstractions without unnecessary complexity
- **Purpose**: Focused on essential LLM operations only

No bloat. No redundancy. Only what matters.

## Development

```bash
# Type checking
pnpm run typecheck

# Build
pnpm run build

# Watch mode
pnpm run dev

# Clean
pnpm run clean
```

## Integration Notes

### For AI Agents
When using this package in automated workflows:
1. Always initialize `LLMClient` with valid API key
2. Use streaming for long-form generation to provide feedback
3. Catch `LLMError` specifically for structured error handling
4. Batch embeddings when processing multiple texts for efficiency
5. Monitor token usage via response objects

### Token Usage Tracking
Every response includes usage statistics:
```typescript
{
  promptTokens: number,
  completionTokens: number, // chat only
  totalTokens: number
}
```

### Performance Considerations
- Batch embedding operations when possible (more efficient)
- Use streaming for real-time user feedback
- Configure appropriate timeouts for your use case
- Leverage `maxRetries` for resilience

---

*Crafted with precision. Built for elegance.*
