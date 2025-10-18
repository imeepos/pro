import { Module } from '@nestjs/common';
import { DatabaseMigrationService } from './database-migration.service';

@Module({
  providers: [DatabaseMigrationService],
  exports: [DatabaseMigrationService],
})
export class DatabaseModule {}
