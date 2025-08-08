import { DatabaseProvider } from '@/common/enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class BackupDto {
  @ApiProperty({ enum: DatabaseProvider, example: DatabaseProvider.POSTGRES })
  @IsEnum(DatabaseProvider)
  provider: DatabaseProvider;

  @ApiProperty({
    description:
      'Full connection string / URI including credentials when needed',
    example: 'postgres://user:pass@localhost:5432/mydb',
  })
  @IsString()
  @IsNotEmpty()
  connectionString: string;

  @ApiProperty({
    description:
      'Database name to backup (for postgres this can also be parsed from connectionString)',
    example: 'mydb',
  })
  @IsString()
  @IsNotEmpty()
  database: string;
}
