import { Injectable, Logger } from '@nestjs/common';
import { BackupStrategy } from '../types';
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
export class MysqlBackupStrategy implements BackupStrategy<BackupDto> {
  private readonly logger = new Logger(MysqlBackupStrategy.name);

  async runBackup(dto: BackupDto): Promise<string> {
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

    try {
      this.logger.debug(`Running mysqldump into ${backupFile}`);
      await exec(cmd, { shell: '/bin/bash' });

      const zipPath = path.join(assetsDir, `mysql-backup-${timestamp}.zip`);
      await zipFile(backupFile, zipPath);

      await fs.rm(backupFile, { force: true });

      this.logger.debug(`MySQL backup created at ${zipPath}`);
      return zipPath;
    } catch (err: any) {
      await fs.rm(backupFile, { force: true }).catch(() => {});
      const errorMessage =
        err?.stderr ?? err?.message ?? 'Unknown error during MySQL backup';
      this.logger.error('MySQL backup failed', errorMessage);
      throw new Error(errorMessage);
    }
  }
}
