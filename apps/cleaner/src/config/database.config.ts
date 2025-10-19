import { ConfigService } from '@nestjs/config';

export const createDatabaseConfig = (configService: ConfigService) => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const nodeEnv = configService.get<string>('NODE_ENV');

  if (databaseUrl) {
    return {
      type: 'postgres' as const,
      url: databaseUrl,
      synchronize: false,
      logging: nodeEnv === 'development',
    };
  }

  return {
    type: 'postgres' as const,
    host: configService.get<string>('POSTGRES_HOST', 'localhost'),
    port: configService.get<number>('POSTGRES_PORT', 5432),
    username: configService.get<string>('POSTGRES_USER', 'postgres'),
    password: configService.get<string>('POSTGRES_PASSWORD', 'postgres123'),
    database: configService.get<string>('POSTGRES_DB', 'pro'),
    synchronize: false,
    logging: nodeEnv === 'development',
  };
};
