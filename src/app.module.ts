import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BackupModule } from './backup/backup.module';
import { ConnectionModule } from './connection/connection.module';

@Module({
  imports: [ConfigModule.forRoot(), BackupModule, ConnectionModule],
})
export class AppModule {}
