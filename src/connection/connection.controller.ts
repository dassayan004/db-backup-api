import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { TestConnectionDto } from './dto/test-connection.dto';

@Controller('connection')
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Post('test-and-list')
  @HttpCode(HttpStatus.OK)
  async listDatabases(@Body() dto: TestConnectionDto) {
    return this.connectionService.listDatabases(dto);
  }

  @Post('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Body() dto: TestConnectionDto) {
    return this.connectionService.dbStats(dto);
  }
}
