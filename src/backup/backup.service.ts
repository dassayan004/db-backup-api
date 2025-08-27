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
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '@/common/subscription/pubsub.module';
import { RestoreDto } from './dto/restore.dto';

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

  private getStrategy(
    provider: DatabaseProvider,
  ): BackupStrategy<BackupDto, RestoreDto> {
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

      const strategy = this.getStrategy(dto.provider);
      const zipPath = await strategy.runBackup(dto);

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

      return new StreamableFile(fileStream, {
        type: 'application/zip',
        disposition: `attachment; filename="${filename}"`,
      });
    } catch (err: any) {
      throw new HttpException(
        err?.message || 'Backup failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async runRestore(dto: RestoreDto, file: Express.Multer.File) {
    try {
      this.logger.log(`Running restore for provider: ${dto.provider}`);
      const strategy = this.getStrategy(dto.provider);
      if (!strategy.runRestore) {
        throw new Error(`Restore not supported for provider: ${dto.provider}`);
      }
      await strategy.runRestore(dto, file);

      this.logger.log('Restore completed successfully!');
      return {
        message: `${dto.provider.toUpperCase()} Restore completed successfully`,
      };
    } catch (err: any) {
      this.logger.error(`Restore failed: ${err?.message}`);
      throw new HttpException(
        err?.message || 'Restore failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
