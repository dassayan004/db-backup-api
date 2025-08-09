import { Injectable, Logger } from '@nestjs/common';
import { BackupStrategy } from './backup.strategy';
import { BackupDto } from '@/backup/dto/backup.dto';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { zipFile } from '../utils/zip.util';
import { parseConnectionString } from '../utils/util';
import { getFormattedTimestamp } from '../utils/date.utils';

const exec = promisify(_exec);
@Injectable()
export class PostgresBackupStrategy implements BackupStrategy<BackupDto> {
  private readonly logger = new Logger(PostgresBackupStrategy.name);

  async runBackup(dto: BackupDto): Promise<string> {
    // const connection = dto.connection as PostgresConnectionDto;
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
    try {
      this.logger.debug(`Running pg_dump into ${backupFile}`);
      await exec(cmd, { shell: '/bin/bash' });

      const zipPath = path.join(assetsDir, `postgres-backup-${timestamp}.zip`);
      await zipFile(backupFile, zipPath);

      await fs.rm(backupFile, { force: true });

      this.logger.debug(`Postgres backup created at ${zipPath}`);
      return zipPath;
    } catch (err: any) {
      await fs.rm(backupFile, { force: true }).catch(() => {});
      this.logger.error(
        'Postgres backup failed',
        err?.stderr ?? err?.message ?? err,
      );
      throw err;
    }
  }
}
