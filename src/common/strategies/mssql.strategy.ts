import { Inject, Injectable, Logger } from '@nestjs/common';
import { BackupDto } from '@/backup/dto/backup.dto';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { zipFile } from '../utils/zip.util';
import { parseMssqlUrlConnectionString } from '../utils/util';
import { getFormattedTimestamp } from '../utils/date.utils';
import { BackupStrategy } from '../types';
import { RestoreDto } from '@/backup/dto/restore.dto';
import { BackupStatus } from '@/backup/dto/backup-log.dto';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../subscription/pubsub.module';

const exec = promisify(_exec);
@Injectable()
export class MsSqlBackupStrategy
  implements BackupStrategy<BackupDto, RestoreDto>
{
  private readonly logger = new Logger(MsSqlBackupStrategy.name);
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {}

  private async publishLog(
    channel: 'backupLogs' | 'restoreLogs',
    status: BackupStatus,
    message: string,
  ) {
    await this.pubSub.publish(channel, {
      [channel]: { status, message },
    });
  }

  async runBackup(dto: BackupDto): Promise<string> {
    await this.publishLog(
      'backupLogs',
      BackupStatus.STARTED,
      'MSSQL backup started',
    );
    const timestamp = getFormattedTimestamp();

    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    const config = parseMssqlUrlConnectionString(dto.connectionString);

    const backupFile = path.join(assetsDir, `mssql-backup-${timestamp}.bacpac`);
    const zipPath = path.join(assetsDir, `mssql-backup-${timestamp}.zip`);

    // Build sqlpackage export command
    // https://learn.microsoft.com/en-us/sql/tools/sqlpackage/sqlpackage-export?view=sql-server-ver16
    const cmd = [
      'sqlpackage',
      '/Action:Export',
      `/SourceServerName:${config.server}${config.port ? `,${config.port}` : ''}`,
      `/SourceDatabaseName:${config.database}`,
      `/SourceUser:${config.user}`,
      `/SourcePassword:${config.password}`,
      `/TargetFile:${backupFile}`,
      '/Quiet',
    ].join(' ');
    await this.publishLog(
      'backupLogs',
      BackupStatus.IN_PROGRESS,
      'MSSQL backup in progress...',
    );

    try {
      this.logger.debug(`Running sqlpackage export into ${backupFile}`);
      await exec(cmd, { shell: '/bin/bash' });

      await zipFile(backupFile, zipPath);
      await fs.rm(backupFile, { force: true });

      this.logger.debug(`MSSQL backup created at ${zipPath}`);
      await this.publishLog(
        'backupLogs',
        BackupStatus.COMPLETED,
        `MSSQL backup completed: ${zipPath}`,
      );
      return zipPath;
    } catch (err: any) {
      await fs.rm(backupFile, { force: true }).catch(() => {});
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during MSSQL backup';

      this.logger.error('MSSQL backup failed', errorMessage);
      await this.publishLog('backupLogs', BackupStatus.FAILED, errorMessage);
      throw new Error(errorMessage);
    }
  }
}
