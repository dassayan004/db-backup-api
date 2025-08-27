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
export class PostgresBackupStrategy
  implements BackupStrategy<BackupDto, RestoreDto>
{
  private readonly logger = new Logger(PostgresBackupStrategy.name);
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
    // const connection = dto.connection as PostgresConnectionDto;
    await this.publishLog(
      'backupLogs',
      BackupStatus.STARTED,
      'Postgres backup started',
    );
    const timestamp = getFormattedTimestamp();

    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    const backupFile = path.join(assetsDir, `postgres-backup-${timestamp}.sql`);
    const conn = parseConnectionString(dto.connectionString);

    const host = conn.hostname;
    const port = conn.port || '5432';
    const username = conn.username;
    const password = conn.password;
    const database = dto.database || conn.database;

    const cmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -F p -d ${database} -f "${backupFile}"`;
    await this.publishLog(
      'backupLogs',
      BackupStatus.IN_PROGRESS,
      'Postgres backup in progress...',
    );
    try {
      this.logger.debug(`Running pg_dump into ${backupFile}`);
      await exec(cmd, { shell: '/bin/bash' });

      const zipPath = path.join(assetsDir, `postgres-backup-${timestamp}.zip`);
      await zipFile(backupFile, zipPath);

      await fs.rm(backupFile, { force: true });

      this.logger.debug(`Postgres backup created at ${zipPath}`);
      await this.publishLog(
        'backupLogs',
        BackupStatus.COMPLETED,
        `Postgres backup completed: ${zipPath}`,
      );
      return zipPath;
    } catch (err: any) {
      await fs.rm(backupFile, { force: true }).catch(() => {});
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during Postgres backup';
      this.logger.error('Postgres backup failed', errorMessage);
      await this.publishLog('backupLogs', BackupStatus.FAILED, errorMessage);
      throw new Error(errorMessage);
    }
  }

  async runRestore(dto: RestoreDto, file: Express.Multer.File) {
    await this.publishLog(
      'restoreLogs',
      BackupStatus.STARTED,
      'Postgres restore started',
    );
    const timestamp = getFormattedTimestamp();
    const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
    const restoreFolder = path.join(assetsDir, `postgres-restore-${timestamp}`);

    await fs.mkdir(restoreFolder, { recursive: true });

    const tempFilePath = path.join(restoreFolder, file.originalname);
    const conn = parseConnectionString(dto.connectionString);
    const host = conn.hostname;
    const port = conn.port || '5432';
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
        'Postgres restore in progress...',
      );
      // Step 1: Check if DB exists
      const checkDbCmd = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${database}'"`;
      const { stdout: dbExists } = await exec(checkDbCmd, {
        shell: '/bin/bash',
      });

      if (!dbExists.trim()) {
        this.logger.debug(`Database ${database} does not exist. Creating...`);

        const createDbCmd = `PGPASSWORD="${password}" createdb -h ${host} -p ${port} -U ${username} ${database}`;
        await exec(createDbCmd, { shell: '/bin/bash' });
      } else {
        this.logger.debug(`Database ${database} already exists.`);
      }
      // Step 2: Restore from backup
      const restoreCmd = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupFilePath}"`;
      this.logger.debug(`Running restore from ${backupFilePath}`);
      await exec(restoreCmd, { shell: '/bin/bash' });

      await this.publishLog(
        'restoreLogs',
        BackupStatus.COMPLETED,
        'Postgres restore completed',
      );
      this.logger.debug('Postgres restore completed');
    } catch (err: any) {
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during Postgres restore';
      this.logger.error('Postgres restore failed', errorMessage);
      await this.publishLog('restoreLogs', BackupStatus.FAILED, errorMessage);
      throw new Error(errorMessage);
    } finally {
      await fs.rm(restoreFolder, { recursive: true, force: true });
    }
  }
}
