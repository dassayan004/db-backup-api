import { Injectable, Logger } from '@nestjs/common';
import { BackupStrategy } from './backup.strategy';
import { BackupDto } from '@/backup/dto/backup.dto';

@Injectable()
export class MongoBackupStrategy implements BackupStrategy<BackupDto> {
  private readonly logger = new Logger(MongoBackupStrategy.name);
  constructor() {}

  runBackup(): Promise<string> {
    // Implement Mongo backup logic here
    return Promise.resolve('Mongo backup completed');
  }
}
