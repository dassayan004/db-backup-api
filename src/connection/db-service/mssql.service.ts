import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConnectionPool } from 'mssql';
import { TestConnectionDto } from '../dto/test-connection.dto';
import { parseMssqlUrlConnectionString } from '@/common/utils/util';

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
}
