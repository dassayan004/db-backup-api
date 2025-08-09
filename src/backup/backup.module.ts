import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import {
  MongoBackupStrategy,
  MsSqlBackupStrategy,
  MysqlBackupStrategy,
  PostgresBackupStrategy,
} from '@/common/strategies';

@Module({
  controllers: [BackupController],
  providers: [
    BackupService,
    PostgresBackupStrategy,
    MongoBackupStrategy,
    MysqlBackupStrategy,
    MsSqlBackupStrategy,
  ],
  exports: [BackupService],
})
export class BackupModule {}
