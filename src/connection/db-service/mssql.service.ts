import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConnectionPool } from 'mssql';
import { TestConnectionDto } from '../dto/test-connection.dto';
import { parseMssqlUrlConnectionString } from '@/common/utils/util';

@Injectable()
export class MsSqlService {
  private readonly logger = new Logger(MsSqlService.name);

  async checkConnection(dto: TestConnectionDto): Promise<boolean> {
    let pool: ConnectionPool | undefined;
    try {
      const config = parseMssqlUrlConnectionString(dto.connectionString);
      pool = await new ConnectionPool(config).connect();

      this.logger.debug(`Connected to MSSQL at ${dto.connectionString}`);
      return true;
    } catch (error) {
      this.logger.error(`MSSQL connection failed: ${error.message}`);
      return false;
    } finally {
      if (pool) {
        await pool
          .close()
          .catch((err) =>
            this.logger.warn(
              `Failed to close MSSQL connection: ${err.message}`,
            ),
          );
      }
    }
  }

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
