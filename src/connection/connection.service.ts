import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TestConnectionDto } from './dto/test-connection.dto';
import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import { DatabaseProvider } from '@/common/enum';
@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);
  async testConnection(
    dto: TestConnectionDto,
  ): Promise<{ connected: boolean }> {
    switch (dto.provider) {
      case DatabaseProvider.POSTGRES:
        return { connected: await this.checkPostgres(dto) };
      case DatabaseProvider.MONGO:
        return { connected: await this.checkMongo(dto) };
      default:
        throw new BadRequestException(
          `Unsupported provider: ${String(dto.provider)}`,
        );
    }
  }

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    switch (dto.provider) {
      case DatabaseProvider.POSTGRES:
        return await this.getPostgresDatabases(dto);
      case DatabaseProvider.MONGO:
        return await this.getMongoDatabases(dto);
      default:
        throw new BadRequestException(
          `Unsupported provider: ${String(dto.provider)}`,
        );
    }
  }
  private async checkPostgres(dto: TestConnectionDto): Promise<boolean> {
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

  private async getPostgresDatabases(
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
      await client.end();
    }
  }

  private async checkMongo(dto: TestConnectionDto): Promise<boolean> {
    const client = new MongoClient(dto.connectionString);
    try {
      await client.connect();
      this.logger.debug(`Connected to MongoDB at ${dto.connectionString}`);
      return true;
    } catch (error) {
      this.logger.error(`MongoDB connection failed`, error.stack);
      return false;
    } finally {
      await client
        .close()
        .catch((err) =>
          this.logger.warn(
            `Failed to close MongoDB connection: ${err.message}`,
          ),
        );
    }
  }

  private async getMongoDatabases(
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
      await client.close();
    }
  }
}
