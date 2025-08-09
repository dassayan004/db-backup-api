import {
  MongoService,
  MsSqlService,
  MysqlService,
  PostgresService,
} from '@/connection/db-service';

export interface BackupStrategy<TDto = any> {
  runBackup(dto: TDto): Promise<string>; // returns path to created zip

  // /**
  //  * Restores a database from a backup file.
  //  * @param dto Connection and other restore-related details
  //  * @param backupFilePath Path to the uploaded backup file (.zip or .sql)
  //  * @param targetDatabaseName Name of the database to restore into (can be new or existing)
  //  */
  // runRestore?(
  //   dto: TDto,
  //   backupFilePath: string,
  //   targetDatabaseName: string,
  // ): Promise<void>;
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
