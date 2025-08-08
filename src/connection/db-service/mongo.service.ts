import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TestConnectionDto } from '../dto/test-connection.dto';

import { MongoClient } from 'mongodb';

@Injectable()
export class MongoService {
  private readonly logger = new Logger(MongoService.name);

  async checkConnection(dto: TestConnectionDto): Promise<boolean> {
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

  async listDatabases(
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
      await client
        .close()
        .catch((err) =>
          this.logger.warn(
            `Failed to close Postgres connection: ${err.message}`,
          ),
        );
    }
  }
}
