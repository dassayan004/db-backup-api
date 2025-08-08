import { Controller, Post, Body } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { TestConnectionDto } from './dto/test-connection.dto';

@Controller('connection')
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Post('test-connection')
  async testConnection(@Body() dto: TestConnectionDto) {
    return this.connectionService.testConnection(dto);
  }

  @Post('list-databases')
  async listDatabases(@Body() dto: TestConnectionDto) {
    return this.connectionService.listDatabases(dto);
  }
}
