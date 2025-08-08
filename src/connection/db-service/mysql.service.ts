import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import * as mysql from 'mysql2/promise';
import { TestConnectionDto } from '../dto/test-connection.dto';

@Injectable()
export class MysqlService {
  private readonly logger = new Logger(MysqlService.name);

  async checkConnection(dto: TestConnectionDto): Promise<boolean> {
    let connection: mysql.Connection | undefined;
    try {
      connection = await mysql.createConnection(dto.connectionString);
      this.logger.debug(`Connected to MySQL at ${dto.connectionString}`);
      return true;
    } catch (error) {
      this.logger.error(`MySQL connection failed: ${error.message}`);
      return false;
    } finally {
      if (connection) {
        await connection
          .end()
          .catch((err) =>
            this.logger.warn(
              `Failed to close MySQL connection: ${err.message}`,
            ),
          );
      }
    }
  }

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    let connection: mysql.Connection | undefined;
    try {
      connection = await mysql.createConnection(dto.connectionString);
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
}
