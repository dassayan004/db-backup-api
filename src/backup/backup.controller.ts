import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackupService } from './backup.service';
import { BackupDto } from './dto/backup.dto';
import { RestoreDto } from './dto/restore.dto';
import { Express } from 'express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DatabaseProvider } from '@/common/enum';

@ApiTags('Backup and Restore')
@Controller('backup-restore')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('backup')
  @HttpCode(HttpStatus.OK)
  async backup(@Body() dto: BackupDto): Promise<StreamableFile> {
    return this.backupService.runBackup(dto);
  }

  @Post('restore')
  @UseInterceptors(FileInterceptor('backupFile'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: Object.values(DatabaseProvider) },
        connectionString: {
          type: 'string',
          example: 'mongodb://user:pass@localhost:27017/mydb',
        },
        targetDatabaseName: { type: 'string', example: 'restored_db' },
        backupFile: {
          type: 'string',
          format: 'binary',
        },
      },
      required: [
        'provider',
        'connectionString',
        'backupFile',
        'targetDatabaseName',
      ],
    },
  })
  @HttpCode(HttpStatus.OK)
  async restore(
    @Body() dto: RestoreDto,
    @UploadedFile() backupFile: Express.Multer.File,
  ) {
    return await this.backupService.runRestore(dto, backupFile);
  }
}
