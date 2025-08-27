import { Inject, Injectable, Logger } from '@nestjs/common';
import { BackupStrategy } from '../types';
import { BackupDto } from '@/backup/dto/backup.dto';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { unzipFile, zipFile } from '../utils/zip.util';
import { parseConnectionString } from '../utils/util';
import { getFormattedTimestamp } from '../utils/date.utils';
import { RestoreDto } from '@/backup/dto/restore.dto';
import { BackupStatus } from '@/backup/dto/backup-log.dto';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../subscription/pubsub.module';

const exec = promisify(_exec);
@Injectable()
export class MysqlBackupStrategy
  implements BackupStrategy<BackupDto, RestoreDto>
{
  private readonly logger = new Logger(MysqlBackupStrategy.name);
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
      'MySQL backup started',
    );
    const timestamp = getFormattedTimestamp();

    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    const backupFile = path.join(assetsDir, `mysql-backup-${timestamp}.sql`);
    const conn = parseConnectionString(dto.connectionString);

    const host = conn.hostname;
    const port = conn.port || '3306';
    const username = conn.username;
    const password = conn.password;
    const database = dto.database || conn.database;

    const cmd = `mariadb-dump -h ${host} -P ${port} -u ${username} -p${password} --single-transaction --skip-lock-tables --ssl --skip-ssl-verify ${database} > "${backupFile}"`;
    await this.publishLog(
      'backupLogs',
      BackupStatus.IN_PROGRESS,
      'MySQL backup in progress...',
    );
    try {
      this.logger.debug(`Running mysqldump into ${backupFile}`);
      await exec(cmd, { shell: '/bin/bash' });

      const zipPath = path.join(assetsDir, `mysql-backup-${timestamp}.zip`);
      await zipFile(backupFile, zipPath);

      await fs.rm(backupFile, { force: true });

      this.logger.debug(`MySQL backup created at ${zipPath}`);
      await this.publishLog(
        'backupLogs',
        BackupStatus.COMPLETED,
        `MySQL backup completed: ${zipPath}`,
      );
      return zipPath;
    } catch (err: any) {
      await fs.rm(backupFile, { force: true }).catch(() => {});
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during MySQL backup';
      this.logger.error('MySQL backup failed', errorMessage);
      await this.publishLog('backupLogs', BackupStatus.FAILED, errorMessage);
      throw new Error(errorMessage);
    }
  }

  async runRestore(dto: RestoreDto, file: Express.Multer.File) {
    await this.publishLog(
      'restoreLogs',
      BackupStatus.STARTED,
      'MySQL restore started',
    );
    const timestamp = getFormattedTimestamp();
    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    const restoreFolder = path.join(assetsDir, `mysql-restore-${timestamp}`);

    await fs.mkdir(restoreFolder, { recursive: true });

    const tempFilePath = path.join(restoreFolder, file.originalname);
    const conn = parseConnectionString(dto.connectionString);
    const host = conn.hostname;
    const port = conn.port || '3306';
    const username = conn.username;
    const password = conn.password;
    const database = dto.targetDatabaseName;

    try {
      await fs.writeFile(tempFilePath, file.buffer);

      let backupFilePath: string | null = null;

      if (tempFilePath.endsWith('.zip')) {
        this.logger.debug(`Unzipping ${tempFilePath} to ${restoreFolder}`);
        await unzipFile(tempFilePath, restoreFolder);

        const unzippedContents = await fs.readdir(restoreFolder);
        const sqlFile = unzippedContents.find((f) => f.endsWith('.sql'));
        if (!sqlFile) {
          throw new Error('No .sql file found in uploaded zip archive.');
        }
        backupFilePath = path.join(restoreFolder, sqlFile);
      } else if (tempFilePath.endsWith('.sql')) {
        backupFilePath = tempFilePath;
      } else {
        throw new Error(
          'Uploaded file must be either a .zip (containing .sql) or a .sql file.',
        );
      }

      await this.publishLog(
        'restoreLogs',
        BackupStatus.IN_PROGRESS,
        'MySQL restore in progress...',
      );

      // Step 1: Check if DB exists
      const checkDbCmd = `mariadb -h ${host} -P ${port} -u ${username} -p${password} -e "SHOW DATABASES LIKE '${database}'"`;
      const { stdout: dbExists } = await exec(checkDbCmd, {
        shell: '/bin/bash',
      });

      if (!dbExists.includes(database)) {
        this.logger.debug(`Database ${database} does not exist. Creating...`);
        const createDbCmd = `mariadb -h ${host} -P ${port} -u ${username} -p${password} -e "CREATE DATABASE \\\`${database}\\\`"`;
        await exec(createDbCmd, { shell: '/bin/bash' });
      } else {
        this.logger.debug(`Database ${database} already exists.`);
      }

      // Step 2: Restore from backup
      const restoreCmd = `mariadb -h ${host} -P ${port} -u ${username} -p${password} ${database} < "${backupFilePath}"`;
      this.logger.debug(`Running mysql restore from ${backupFilePath}`);
      await exec(restoreCmd, { shell: '/bin/bash' });

      await this.publishLog(
        'restoreLogs',
        BackupStatus.COMPLETED,
        'MySQL restore completed',
      );
      this.logger.debug('MySQL restore completed');
    } catch (err: any) {
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during MySQL restore';
      this.logger.error('MySQL restore failed', errorMessage);
      await this.publishLog('restoreLogs', BackupStatus.FAILED, errorMessage);
      throw new Error(errorMessage);
    } finally {
      await fs.rm(restoreFolder, { recursive: true, force: true });
    }
  }
}
