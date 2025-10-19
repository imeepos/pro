import { registerAs } from '@nestjs/config';

export default registerAs('analyzer', () => ({
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    cleanedDataQueue: process.env.CLEANED_DATA_QUEUE || 'cleaned_data_queue',
    analysisResultQueue: process.env.ANALYSIS_RESULT_QUEUE || 'analysis_result_queue',
  },

  analysis: {
    sentimentBatchSize: parseInt(process.env.SENTIMENT_BATCH_SIZE || '10', 10),
    nlpBatchSize: parseInt(process.env.NLP_BATCH_SIZE || '5', 10),
    enableLLM: process.env.ENABLE_LLM === 'true',
  },

  llm: {
    defaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'deepseek',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '3', 10),
    temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '4096', 10),
    retry: {
      maxAttempts: parseInt(process.env.DEEPSEEK_RETRY_MAX_ATTEMPTS || '3', 10),
      baseDelayMs: parseInt(process.env.DEEPSEEK_RETRY_BASE_DELAY_MS || '1000', 10),
      backoffFactor: parseFloat(process.env.DEEPSEEK_RETRY_BACKOFF_FACTOR || '2'),
      maxDelayMs: parseInt(process.env.DEEPSEEK_RETRY_MAX_DELAY_MS || '10000', 10),
    },
  },
}));
