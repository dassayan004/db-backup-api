import { Controller, Get } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  sayHi(): string {
    return 'Hi!';
  }
}
