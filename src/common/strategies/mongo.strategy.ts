import { Inject, Injectable, Logger } from '@nestjs/common';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BackupStrategy } from '../types';
import { BackupDto } from '@/backup/dto/backup.dto';
import { zipDirectory, unzipFile } from '@/common/utils/zip.util';
import { getFormattedTimestamp } from '../utils/date.utils';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../subscription/pubsub.module';
import { BackupStatus } from '@/backup/dto/backup-log.dto';
import { RestoreDto } from '@/backup/dto/restore.dto';

const exec = promisify(_exec);
@Injectable()
export class MongoBackupStrategy
  implements BackupStrategy<BackupDto, RestoreDto>
{
  private readonly logger = new Logger(MongoBackupStrategy.name);
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
      'Mongo backup started',
    );
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
      await this.publishLog(
        'backupLogs',
        BackupStatus.IN_PROGRESS,
        'Mongo backup in progress...',
      );
      const zipPath = path.join(assetsDir, `mongo-backup-${timestamp}.zip`);
      await zipDirectory(dumpFolder, zipPath);

      await fs.rm(dumpFolder, { recursive: true, force: true });
      this.logger.debug(`Mongo backup created at ${zipPath}`);
      await this.publishLog(
        'backupLogs',
        BackupStatus.COMPLETED,
        `Mongo backup completed: ${zipPath}`,
      );
      return zipPath;
    } catch (err: any) {
      await fs.rm(dumpFolder, { recursive: true, force: true }).catch(() => {});
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during Mongo backup';
      this.logger.error('Mongo backup failed', errorMessage);
      await this.publishLog('backupLogs', BackupStatus.FAILED, errorMessage);
      throw new Error(errorMessage);
    }
  }

  async runRestore(dto: RestoreDto, file: Express.Multer.File): Promise<void> {
    await this.publishLog(
      'restoreLogs',
      BackupStatus.STARTED,
      'Mongo restore started',
    );
    const timestamp = getFormattedTimestamp();
    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    const restoreFolder = path.join(assetsDir, `mongo-restore-${timestamp}`);

    await fs.mkdir(restoreFolder, { recursive: true });

    const tempFilePath = path.join(restoreFolder, file.originalname);

    try {
      await fs.writeFile(tempFilePath, file.buffer);

      this.logger.debug(`Unzipping ${tempFilePath} to ${restoreFolder}`);
      await unzipFile(tempFilePath, restoreFolder);

      await this.publishLog(
        'restoreLogs',
        BackupStatus.IN_PROGRESS,
        'Mongo restore in progress...',
      );
      const unzippedContents = await fs.readdir(restoreFolder);
      let dumpDir: string | undefined;
      for (const item of unzippedContents) {
        const itemPath = path.join(restoreFolder, item);
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          dumpDir = item;
          break;
        }
      }
      if (!dumpDir) {
        throw new Error('Could not locate BSON dump directory in backup file');
      }
      const dbArg = `--db="${dto.targetDatabaseName}"`;

      const cmd = `mongorestore --uri="${dto.connectionString}" ${dbArg} --dir="${path.join(restoreFolder, dumpDir)}" --drop`;
      this.logger.debug(`Running mongorestore from ${restoreFolder}`);
      await exec(cmd, { shell: '/bin/bash' });

      this.logger.debug('Mongo restore completed');
      await this.publishLog(
        'restoreLogs',
        BackupStatus.COMPLETED,
        'Mongo restore completed',
      );
    } catch (err: any) {
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during Mongo restore';
      this.logger.error('Mongo restore failed', errorMessage);
      await this.publishLog('restoreLogs', BackupStatus.FAILED, errorMessage);
      throw new Error(errorMessage);
    } finally {
      await fs.rm(restoreFolder, { recursive: true, force: true });
    }
  }
}
