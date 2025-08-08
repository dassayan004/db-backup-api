import { Injectable, Logger } from '@nestjs/common';
import {
  MongoBackupStrategy,
  PostgresBackupStrategy,
} from '@/common/strategies';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly pgStrategy: PostgresBackupStrategy,
    private readonly mongoStrategy: MongoBackupStrategy,
  ) {}
}
