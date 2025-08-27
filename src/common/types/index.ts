import {
  MongoService,
  MsSqlService,
  MysqlService,
  PostgresService,
} from '@/connection/db-service';

export interface BackupStrategy<TBackupDto = any, TRestoreDto = any> {
  runBackup(dto: TBackupDto): Promise<string>; // returns path to created zip

  runRestore?(dto: TRestoreDto, backupFile: Express.Multer.File): Promise<void>;
}

export interface DatabaseStatsDto {
  version: string;
  activeConnections: number;
  uptime: unknown;
  diskUsage: string;
  // maxConnections: number;
  // threadsRunning: number;
  // dataSize: string;
  // indexSize: string;
  // queriesPerSecond: number;
  // slowQueries: number;
  // bufferPoolSize: string;
  // bufferPoolUsagePct: number;
  responseTimeHistory?: { timestamp: string; ms: number }[];
}
export type AllDbService =
  | PostgresService
  | MongoService
  | MysqlService
  | MsSqlService;
