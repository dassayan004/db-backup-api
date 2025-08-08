import { Injectable, Logger } from '@nestjs/common';
import { BackupStrategy } from './backup.strategy';
import { BackupDto } from '@/backup/dto/backup.dto';

@Injectable()
export class PostgresBackupStrategy implements BackupStrategy<BackupDto> {
  private readonly logger = new Logger(PostgresBackupStrategy.name);
  constructor() {}

  runBackup(): Promise<string> {
    // Implement PostgreSQL backup logic here
    return Promise.resolve('PostgreSQL backup completed');
  }
}
