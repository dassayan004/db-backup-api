import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupDto } from './dto/backup.dto';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async backup(@Body() dto: BackupDto): Promise<StreamableFile> {
    return this.backupService.runBackup(dto);
  }
}
