import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TestConnectionDto } from '../dto/test-connection.dto';
import { Client as PgClient } from 'pg';
import { DatabaseStatsDto } from '@/common/types';

@Injectable()
export class PostgresService {
  private readonly logger = new Logger(PostgresService.name);

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    const client = new PgClient({ connectionString: dto.connectionString });
    try {
      await client.connect();
      const result = await client.query(
        `SELECT datname FROM pg_database WHERE datistemplate = false;`,
      );
      const dbs = result.rows.map((r) => r.datname);
      return { databases: dbs };
    } catch (error) {
      throw new BadRequestException(
        `Postgres list databases failed: ${error.message}`,
      );
    } finally {
      await client
        .end()
        .catch((err) =>
          this.logger.warn(
            `Failed to close Postgres connection: ${err.message}`,
          ),
        );
    }
  }

  async getStats(dto: TestConnectionDto): Promise<DatabaseStatsDto> {
    const start = Date.now();
    const client = new PgClient({ connectionString: dto.connectionString });
    await client.connect();

    try {
      // Version
      const versionRes = await client.query('SELECT version();');

      // Active connections
      const activeConnsRes = await client.query(
        'SELECT count(*) FROM pg_stat_activity;',
      );

      // Uptime (requires server start time)
      const uptimeRes = await client.query(
        `SELECT now() - pg_postmaster_start_time() as uptime;`,
      );

      // Disk usage
      const dbSizeRes = await client.query(
        `SELECT pg_database_size(current_database()) as size_bytes;`,
      );
      const sizeBytes = parseInt(dbSizeRes.rows[0].size_bytes, 10);
      const diskUsage = `${(sizeBytes / 1024).toFixed(1)} KB`;
      const elapsed = Date.now() - start;
      return {
        version: versionRes.rows[0].version,
        activeConnections: parseInt(activeConnsRes.rows[0].count, 10),
        uptime: uptimeRes.rows[0].uptime,
        diskUsage,
        responseTimeHistory: [
          { timestamp: new Date().toISOString(), ms: elapsed },
        ],
      };
    } finally {
      await client.end();
    }
  }
}
