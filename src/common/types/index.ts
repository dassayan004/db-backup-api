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
