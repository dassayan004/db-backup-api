import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import {
  MongoBackupStrategy,
  MsSqlBackupStrategy,
  MysqlBackupStrategy,
  PostgresBackupStrategy,
} from '@/common/strategies';
import { BackupDto } from './dto/backup.dto';
import { DatabaseProvider } from '@/common/enum';
import path from 'path';
import { createReadStream, promises as fs } from 'fs';
import { BackupStrategy } from '@/common/types';
import { BackupStatus } from './dto/backup-log.dto';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '@/common/subscription/pubsub.module';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly pgStrategy: PostgresBackupStrategy,
    private readonly mongoStrategy: MongoBackupStrategy,
    private readonly mysqlStrategy: MysqlBackupStrategy,
    private readonly mssqlStrategy: MsSqlBackupStrategy,
    @Inject(PUB_SUB) private readonly backupPubSub: PubSub,
  ) {}

  private getStrategy(provider: DatabaseProvider): BackupStrategy<BackupDto> {
    switch (provider) {
      case DatabaseProvider.POSTGRES:
        return this.pgStrategy;
      case DatabaseProvider.MONGO:
        return this.mongoStrategy;
      case DatabaseProvider.MYSQL:
      case DatabaseProvider.MARIADB:
        return this.mysqlStrategy;
      case DatabaseProvider.MSSQL:
        return this.mssqlStrategy;
      default:
        throw new Error(`Unsupported provider: ${String(provider)}`);
    }
  }

  async runBackup(dto: BackupDto): Promise<StreamableFile> {
    try {
      this.logger.log(`Running backup for provider: ${dto.provider}`);
      this.backupPubSub.publish('backupLogs', {
        backupLogs: {
          status: BackupStatus.STARTED,
          message: `Starting backup for ${dto.provider}`,
        },
      });

      const strategy = this.getStrategy(dto.provider);
      const zipPath = await strategy.runBackup(dto);

      this.backupPubSub.publish('backupLogs', {
        backupLogs: {
          status: BackupStatus.IN_PROGRESS,
          message: `Backup file is ready for ${dto.provider}`,
        },
      });
      const filename = path.basename(zipPath);
      const fileStream = createReadStream(zipPath);

      fileStream.on('close', () => {
        void (async () => {
          try {
            await fs.rm(zipPath, { force: true });
          } catch {
            // ignore
          }
        })();
      });

      this.backupPubSub.publish('backupLogs', {
        backupLogs: {
          status: BackupStatus.COMPLETED,
          message: 'Backup completed successfully!',
        },
      });
      return new StreamableFile(fileStream, {
        type: 'application/zip',
        disposition: `attachment; filename="${filename}"`,
      });
    } catch (err: any) {
      this.backupPubSub.publish('backupLogs', {
        backupLogs: {
          status: BackupStatus.FAILED,
          message: `Backup failed: ${err?.message}`,
        },
      });
      throw new HttpException(
        err?.message || 'Backup failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
