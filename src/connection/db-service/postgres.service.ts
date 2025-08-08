import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TestConnectionDto } from '../dto/test-connection.dto';
import { Client as PgClient } from 'pg';

@Injectable()
export class PostgresService {
  private readonly logger = new Logger(PostgresService.name);

  async checkConnection(dto: TestConnectionDto): Promise<boolean> {
    const client = new PgClient({ connectionString: dto.connectionString });
    try {
      await client.connect();
      this.logger.debug(`Connected to Postgres at ${dto.connectionString}`);
      return true;
    } catch (error) {
      this.logger.error(`Postgres connection failed`, error.stack);
      return false;
    } finally {
      await client
        .end()
        .catch((err) =>
          this.logger.warn(
            `Failed to close Postgres connection: ${err.message}`,
          ),
        );
    }
  }

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    const client = new PgClient({ connectionString: dto.connectionString });
    try {
      await client.connect();
      const result = await client.query(
        `SELECT datname FROM pg_database WHERE datistemplate = false;`,
      );
      const dbs = result.rows.map((r) => r.datname);
      return { databases: dbs };
    } catch (error) {
      throw new BadRequestException(
        `Postgres list databases failed: ${error.message}`,
      );
    } finally {
      await client
        .end()
        .catch((err) =>
          this.logger.warn(
            `Failed to close Postgres connection: ${err.message}`,
          ),
        );
    }
  }
}
