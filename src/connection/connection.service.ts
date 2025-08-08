import { BadRequestException, Injectable } from '@nestjs/common';
import { TestConnectionDto } from './dto/test-connection.dto';

import { DatabaseProvider } from '@/common/enum';
import {
  MongoService,
  MssqlService,
  MysqlService,
  PostgresService,
} from './db-service';
@Injectable()
export class ConnectionService {
  constructor(
    private readonly pgService: PostgresService,
    private readonly mongoService: MongoService,
    private readonly mysqlService: MysqlService,
    private readonly mssqlService: MssqlService,
  ) {}
  async testConnection(
    dto: TestConnectionDto,
  ): Promise<{ connected: boolean }> {
    switch (dto.provider) {
      case DatabaseProvider.POSTGRES:
        return { connected: await this.pgService.checkConnection(dto) };
      case DatabaseProvider.MONGO:
        return { connected: await this.mongoService.checkConnection(dto) };
      case DatabaseProvider.MYSQL:
        return { connected: await this.mysqlService.checkConnection(dto) };
      case DatabaseProvider.MSSQL:
        return { connected: await this.mssqlService.checkConnection(dto) };
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
        return this.pgService.listDatabases(dto);
      case DatabaseProvider.MONGO:
        return this.mongoService.listDatabases(dto);
      case DatabaseProvider.MYSQL:
        return this.mysqlService.listDatabases(dto);
      case DatabaseProvider.MSSQL:
        return this.mssqlService.listDatabases(dto);
      default:
        throw new BadRequestException(
          `Unsupported provider: ${String(dto.provider)}`,
        );
    }
  }
}
