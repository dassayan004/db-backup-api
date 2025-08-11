import { Inject, Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BackupStrategy } from '../types';
import { BackupDto } from '@/backup/dto/backup.dto';
import { zipDirectory } from '@/common/utils/zip.util';
import { getFormattedTimestamp } from '../utils/date.utils';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../subscription/pubsub.module';
import { BackupStatus } from '@/backup/dto/backup-log.dto';

const exec = promisify(_exec);
@Injectable()
export class MongoBackupStrategy implements BackupStrategy<BackupDto> {
  private readonly logger = new Logger(MongoBackupStrategy.name);
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {}

  private async publishLog(status: BackupStatus, message: string) {
    await this.pubSub.publish('backupLogs', {
      backupLogs: { status, message },
    });
  }
  async runBackup(dto: BackupDto): Promise<string> {
    // const connection = dto.connection as MongoConnectionDto;
    const timestamp = getFormattedTimestamp();

    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    const dumpFolder = path.join(assetsDir, `mongo-dump-${timestamp}`);
    await fs.mkdir(dumpFolder, { recursive: true });

    const dbArg = dto.database ? ` --db="${dto.database}"` : '';
    const cmd = `mongodump --uri="${dto.connectionString}"${dbArg} --out="${dumpFolder}"`;

    try {
      this.logger.debug(`Running mongodump into ${dumpFolder}`);
      await exec(cmd, { shell: '/bin/bash' });

      const zipPath = path.join(assetsDir, `mongo-backup-${timestamp}.zip`);
      await zipDirectory(dumpFolder, zipPath);

      await fs.rm(dumpFolder, { recursive: true, force: true });
      this.logger.debug(`Mongo backup created at ${zipPath}`);

      return zipPath;
    } catch (err: any) {
      await fs.rm(dumpFolder, { recursive: true, force: true }).catch(() => {});
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during Mongo backup';
      this.logger.error('Mongo backup failed', errorMessage);
      throw new Error(errorMessage);
    }
  }
}
