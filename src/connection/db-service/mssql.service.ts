import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConnectionPool } from 'mssql';
import { TestConnectionDto } from '../dto/test-connection.dto';
import { parseMssqlUrlConnectionString } from '@/common/utils/util';
import { DatabaseStatsDto } from '@/common/types';

@Injectable()
export class MsSqlService {
  private readonly logger = new Logger(MsSqlService.name);

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    let pool: ConnectionPool | undefined;
    try {
      const config = parseMssqlUrlConnectionString(dto.connectionString);
      pool = await new ConnectionPool(config).connect();
      const result = await pool
        .request()
        .query(`SELECT name FROM sys.databases`);
      const databases = result.recordset.map((row) => row.name);
      return { databases };
    } catch (error) {
      throw new BadRequestException(
        `MSSQL list databases failed: ${error.message}`,
      );
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }
  async getStats(dto: TestConnectionDto): Promise<DatabaseStatsDto> {
    const start = Date.now();
    let pool: ConnectionPool | undefined;

    try {
      const config = parseMssqlUrlConnectionString(dto.connectionString);
      pool = await new ConnectionPool(config).connect();
      /// Version, Uptime, Disk usage (data + log files for current DB), Active connections (exclude system sessions)
      const [versionResult, activeConnResult, uptimeResult, diskUsageResult] =
        await Promise.all([
          pool
            .request()
            .query<{ version: string }>(`SELECT @@VERSION AS version;`),

          pool.request().query<{ count: number }>(
            `SELECT COUNT(*) AS count
         FROM sys.dm_exec_sessions
         WHERE is_user_process = 1;`,
          ),

          pool.request().query<{ start_time: Date }>(
            `SELECT sqlserver_start_time AS start_time
         FROM sys.dm_os_sys_info;`,
          ),

          pool.request().query<{ size_kb: number }>(
            `SELECT CAST(SUM(size) * 8 AS BIGINT) AS size_kb
         FROM sys.master_files
         WHERE database_id = DB_ID();`,
          ),
        ]);

      const version = versionResult.recordset[0]?.version ?? 'Unknown';
      const activeConnections = activeConnResult.recordset[0]?.count ?? 0;

      const startTime = uptimeResult.recordset[0]?.start_time;
      const uptime = startTime
        ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
        : 0;

      const diskUsage = `${diskUsageResult.recordset[0]?.size_kb ?? 0} KB`;

      const elapsed = Date.now() - start;

      return {
        version,
        activeConnections,
        uptime,
        diskUsage,
        responseTimeHistory: [
          { timestamp: new Date().toISOString(), ms: elapsed },
        ],
      };
    } catch (error) {
      throw new BadRequestException(`MSSQL get stats failed: ${error.message}`);
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }
}
