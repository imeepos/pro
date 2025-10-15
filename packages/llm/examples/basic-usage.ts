import { LLMClient } from '../src';

async function main() {
  const llm = new LLMClient({
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: 'gpt-4o-mini',
  });

  console.log('=== 单轮对话 ===');
  const response = await llm.chat.chat([
    { role: 'user', content: '用一句话介绍 TypeScript' },
  ]);
  console.log('回复:', response.content);
  console.log('Token 消耗:', response.usage);

  console.log('\n=== 流式对话 ===');
  const stream = llm.chat.chatStream([
    { role: 'user', content: '写一首关于代码的诗' },
  ]);

  for await (const chunk of stream) {
    if (chunk.delta) {
      process.stdout.write(chunk.delta);
    }
    if (chunk.finishReason) {
      console.log('\n完成原因:', chunk.finishReason);
    }
  }

  console.log('\n=== 文本向量化 ===');
  const embedding = await llm.embedding.embed('人工智能');
  console.log('向量维度:', embedding.embedding.length);
  console.log('前 5 个值:', embedding.embedding.slice(0, 5));
  console.log('Token 消耗:', embedding.usage);
}

main().catch(console.error);
