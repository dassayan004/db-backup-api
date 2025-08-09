import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TestConnectionDto } from '../dto/test-connection.dto';

import { MongoClient } from 'mongodb';
import { DatabaseStatsDto } from '@/common/types';

@Injectable()
export class MongoService {
  private readonly logger = new Logger(MongoService.name);

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    const client = new MongoClient(dto.connectionString);
    try {
      await client.connect();
      const adminDb = client.db().admin();
      const list = await adminDb.listDatabases();
      return { databases: list.databases.map((d) => d.name) };
    } catch (error) {
      throw new BadRequestException(
        `MongoDB list databases failed: ${error.message}`,
      );
    } finally {
      await client
        .close()
        .catch((err) =>
          this.logger.warn(
            `Failed to close Postgres connection: ${err.message}`,
          ),
        );
    }
  }

  async getStats(dto: TestConnectionDto): Promise<DatabaseStatsDto> {
    const client = new MongoClient(dto.connectionString);
    try {
      const start = Date.now();
      await client.connect();
      const elapsed = Date.now() - start;

      const db = client.db();
      const adminDb = db.admin();

      // Connection status
      const connStatus = await adminDb.command({ connectionStatus: 1 });

      // MongoDB version
      const buildInfo = await adminDb.command({ buildInfo: 1 });
      const version = buildInfo.version;
      const activeConnections = connStatus.connections ?? 0;

      // Try to get uptime (Atlas-safe)
      let uptimeSeconds: number | null = null;
      try {
        const serverStatus = await adminDb.command({ serverStatus: 1 });
        uptimeSeconds = serverStatus.uptime;
      } catch {
        try {
          const hostInfo = await adminDb.command({ hostInfo: 1 });
          if (hostInfo.system?.currentTime && hostInfo.system?.startTime) {
            const currentTime = new Date(hostInfo.system.currentTime).getTime();
            const startTime = new Date(hostInfo.system.startTime).getTime();
            uptimeSeconds = Math.floor((currentTime - startTime) / 1000);
          }
        } catch {
          uptimeSeconds = null; // If all fail
        }
      }

      // Storage stats
      const stats = await db.stats();
      const sizeBytes = stats.storageSize ?? 0;
      const diskUsage = `${(sizeBytes / 1024).toFixed(1)} KB`;
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
      throw new BadRequestException(`MongoDB stats failed: ${error.message}`);
    } finally {
      await client.close().catch(() => {});
    }
  }
}
