import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import {
  MongoBackupStrategy,
  PostgresBackupStrategy,
} from '@/common/strategies';

@Module({
  controllers: [BackupController],
  providers: [BackupService, PostgresBackupStrategy, MongoBackupStrategy],
  exports: [BackupService],
})
export class BackupModule {}
