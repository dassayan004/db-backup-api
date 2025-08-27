import { DatabaseProvider } from '@/common/enum';

import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class RestoreDto {
  @IsEnum(DatabaseProvider)
  provider: DatabaseProvider;

  @IsString()
  @IsNotEmpty()
  connectionString: string;

  @IsString()
  @IsNotEmpty()
  targetDatabaseName: string;
}
