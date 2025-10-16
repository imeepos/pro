# @pro/llm

优雅的大模型工具库，基于 OpenAI SDK 封装。

## 特性

- **类型安全** - 完整的 TypeScript 类型定义
- **流式支持** - 原生支持 streaming 对话
- **错误优雅** - 结构化的错误处理
- **极简 API** - 简洁而强大的接口设计

## 安装

```bash
pnpm add @pro/llm
```

## 快速开始

### 初始化客户端

```typescript
import { LLMClient } from '@pro/llm';

const llm = new LLMClient({
  apiKey: process.env.OPENAI_API_KEY,
  defaultModel: 'gpt-4o-mini', // 可选
});
```

### 对话 Chat

#### 单轮对话

```typescript
const response = await llm.chat.chat([
  { role: 'user', content: 'Hello!' }
]);

console.log(response.content);
console.log(response.usage);
```

#### 多轮对话

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is TypeScript?' },
];

const response = await llm.chat.chat(messages, {
  temperature: 0.7,
  maxTokens: 1000,
});
```

#### 流式对话

```typescript
const stream = llm.chat.chatStream([
  { role: 'user', content: 'Tell me a story' }
]);

for await (const chunk of stream) {
  process.stdout.write(chunk.delta);

  if (chunk.finishReason) {
    console.log('\nFinished:', chunk.finishReason);
  }
}
```

### 向量化 Embeddings

#### 单个文本

```typescript
const result = await llm.embedding.embed('Hello world');
console.log(result.embedding); // number[]
console.log(result.usage);
```

#### 批量文本

```typescript
const texts = ['Hello', 'World', 'TypeScript'];
const result = await llm.embedding.embedBatch(texts);

console.log(result.embeddings); // number[][]
console.log(result.usage);
```

## API

### LLMClient

```typescript
interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}
```

### ChatService

```typescript
interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  user?: string;
}
```

### EmbeddingService

```typescript
interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  user?: string;
}
```

## 错误处理

```typescript
import { LLMError } from '@pro/llm';

try {
  const response = await llm.chat.chat(messages);
} catch (error) {
  if (error instanceof LLMError) {
    console.error('Code:', error.code);
    console.error('Status:', error.statusCode);
    console.error('Details:', error.details);
  }
}
```

## License

UNLICENSED
