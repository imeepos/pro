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
}));
