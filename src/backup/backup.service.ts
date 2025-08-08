import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import {
  MongoBackupStrategy,
  MysqlBackupStrategy,
  PostgresBackupStrategy,
} from '@/common/strategies';
import { BackupDto } from './dto/backup.dto';
import { DatabaseProvider } from '@/common/enum';
import path from 'path';
import { createReadStream, promises as fs } from 'fs';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly pgStrategy: PostgresBackupStrategy,
    private readonly mongoStrategy: MongoBackupStrategy,
    private readonly mysqlStrategy: MysqlBackupStrategy,
  ) {}

  async runBackup(dto: BackupDto): Promise<StreamableFile> {
    try {
      this.logger.log(`Running backup for provider: ${dto.provider}`);

      let zipPath: string;
      switch (dto.provider) {
        case DatabaseProvider.POSTGRES:
          zipPath = await this.pgStrategy.runBackup(dto);
          break;
        case DatabaseProvider.MONGO:
          zipPath = await this.mongoStrategy.runBackup(dto);
          break;
        case DatabaseProvider.MYSQL:
          zipPath = await this.mysqlStrategy.runBackup(dto);
          break;
        default:
          throw new Error(`Unsupported provider: ${String(dto.provider)}`);
      }

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
      this.logger.error(`Backup failed: ${err?.message || err}`);
      throw new HttpException(
        err?.message || 'Backup failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
