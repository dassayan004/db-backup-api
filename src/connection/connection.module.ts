import { Module } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { ConnectionController } from './connection.controller';
import {
  PostgresService,
  MongoService,
  MysqlService,
  MsSqlService,
} from './db-service';

@Module({
  controllers: [ConnectionController],
  providers: [
    ConnectionService,
    PostgresService,
    MongoService,
    MysqlService,
    MsSqlService,
  ],
})
export class ConnectionModule {}
