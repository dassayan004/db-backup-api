export interface DatabaseStatsDto {
  version: string;

  activeConnections: number;

  uptime: unknown;

  diskUsage: string;

  responseTimeHistory?: { timestamp: string; ms: number }[];
}
