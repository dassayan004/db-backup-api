import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { createConnection, Connection, RowDataPacket } from 'mysql2/promise';
import { TestConnectionDto } from '../dto/test-connection.dto';
import { DatabaseStatsDto } from '@/common/types';

@Injectable()
export class MysqlService {
  private readonly logger = new Logger(MysqlService.name);

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    let connection: Connection | undefined;
    try {
      connection = await createConnection(dto.connectionString);
      const [rows] = await connection.query(`SHOW DATABASES`);
      const dbRows = rows as Array<Record<string, any>>;
      const databases = dbRows.map((row) => String(Object.values(row)[0]));
      return { databases };
    } catch (error) {
      throw new BadRequestException(
        `MySQL list databases failed: ${error.message}`,
      );
    } finally {
      if (connection) {
        await connection.end().catch(() => {});
      }
    }
  }

  async getStats(dto: TestConnectionDto): Promise<DatabaseStatsDto> {
    const start = Date.now();
    let connection: Connection | undefined;
    try {
      connection = await createConnection(dto.connectionString);

      // Version
      const [versionRows] = await connection.execute<RowDataPacket[]>(
        'SELECT VERSION() AS version;',
      );
      const version = versionRows[0]?.version ?? 'Unknown';

      // Active connections
      const [connRows] = await connection.execute<RowDataPacket[]>(
        "SHOW STATUS WHERE `Variable_name` = 'Threads_connected';",
      );
      const activeConnections = parseInt(connRows[0]?.Value ?? '0', 10);

      // Uptime (seconds)
      const [uptimeRows] = await connection.execute<RowDataPacket[]>(
        "SHOW STATUS WHERE `Variable_name` = 'Uptime';",
      );
      const uptimeSeconds = parseInt(uptimeRows[0]?.Value ?? '0', 10);

      // Disk usage for current DB
      const [sizeRows] = await connection.execute<RowDataPacket[]>(
        `
        SELECT ROUND(SUM(data_length + index_length) / 1024, 1) AS size_kb
        FROM information_schema.tables
        WHERE table_schema = DATABASE();
        `,
      );
      const diskUsage = `${sizeRows[0]?.size_kb ?? 0} KB`;

      const elapsed = Date.now() - start;

      return {
        version,
        activeConnections,
        uptime: uptimeSeconds,
        diskUsage,
        responseTimeHistory: [
          { timestamp: new Date().toISOString(), ms: elapsed },
        ],
      };
    } catch (error) {
      throw new BadRequestException(`MySQL stats failed: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end().catch(() => {});
      }
    }
  }
}
