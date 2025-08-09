import { BadRequestException, Injectable } from '@nestjs/common';
import { TestConnectionDto } from './dto/test-connection.dto';

import { DatabaseProvider } from '@/common/enum';
import {
  MongoService,
  MsSqlService,
  MysqlService,
  PostgresService,
} from './db-service';
@Injectable()
export class ConnectionService {
  constructor(
    private readonly pgService: PostgresService,
    private readonly mongoService: MongoService,
    private readonly mysqlService: MysqlService,
    private readonly mssqlService: MsSqlService,
  ) {}

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
  async dbStats(dto: TestConnectionDto) {
    switch (dto.provider) {
      case DatabaseProvider.POSTGRES:
        return this.pgService.getStats(dto);
      case DatabaseProvider.MONGO:
        return this.mongoService.getStats(dto);
      // case DatabaseProvider.MYSQL:
      //   return this.mysqlService.getStats(dto);
      // case DatabaseProvider.MSSQL:
      //   return this.mssqlService.getStats(dto);
      default:
        throw new BadRequestException(
          `Unsupported provider: ${String(dto.provider)}`,
        );
    }
  }
}
