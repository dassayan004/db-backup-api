import { BadRequestException, Injectable } from '@nestjs/common';
import { TestConnectionDto } from './dto/test-connection.dto';

import { DatabaseProvider } from '@/common/enum';
import {
  MongoService,
  MsSqlService,
  MysqlService,
  PostgresService,
} from './db-service';
import { AllDbService } from '@/common/types';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly pgService: PostgresService,
    private readonly mongoService: MongoService,
    private readonly mysqlService: MysqlService,
    private readonly mssqlService: MsSqlService,
  ) {}

  private getService(provider: DatabaseProvider): AllDbService {
    switch (provider) {
      case DatabaseProvider.POSTGRES:
        return this.pgService;
      case DatabaseProvider.MONGO:
        return this.mongoService;
      case DatabaseProvider.MYSQL:
      case DatabaseProvider.MARIADB: // MariaDB uses MySQL service
        return this.mysqlService;
      case DatabaseProvider.MSSQL:
        return this.mssqlService;
      default:
        throw new BadRequestException(
          `Unsupported provider: ${String(provider)}`,
        );
    }
  }

  async listDatabases(
    dto: TestConnectionDto,
  ): Promise<{ databases: string[] }> {
    const service = this.getService(dto.provider);
    return service.listDatabases(dto);
  }

  async dbStats(dto: TestConnectionDto) {
    const service = this.getService(dto.provider);
    return service.getStats(dto);
  }
}
