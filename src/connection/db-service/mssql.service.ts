import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConnectionPool } from 'mssql';
import { TestConnectionDto } from '../dto/test-connection.dto';

@Injectable()
export class MssqlService {
  private readonly logger = new Logger(MssqlService.name);

  async checkConnection(dto: TestConnectionDto): Promise<boolean> {
    let pool: ConnectionPool | undefined;
    try {
      pool = await new ConnectionPool(dto.connectionString).connect();
      this.logger.debug(`Connected to MSSQL at ${dto.connectionString}`);
      return true;
    } catch (error) {
      this.logger.error(`MSSQL connection failed`, error.stack);
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
      pool = await new ConnectionPool(dto.connectionString).connect();
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
