import { ConfigService } from '@nestjs/config';

export const createMongoDBConfig = (configService: ConfigService) => {
  return {
    uri: configService.get<string>('MONGODB_URL', 'mongodb://localhost:27017/pro'),
  };
};
