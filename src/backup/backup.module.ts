import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import {
  MongoBackupStrategy,
  MsSqlBackupStrategy,
  MysqlBackupStrategy,
  PostgresBackupStrategy,
} from '@/common/strategies';
import { BackupResolver } from './backup.resolver';

@Module({
  controllers: [BackupController],
  providers: [
    BackupService,
    PostgresBackupStrategy,
    MongoBackupStrategy,
    MysqlBackupStrategy,
    MsSqlBackupStrategy,
    BackupResolver,
  ],
  exports: [BackupService],
})
export class BackupModule {}
