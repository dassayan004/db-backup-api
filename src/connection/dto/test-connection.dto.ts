// test-connection.dto.ts
import { DatabaseProvider } from '@/common/enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class TestConnectionDto {
  @ApiProperty({ enum: DatabaseProvider, example: DatabaseProvider.POSTGRES })
  @IsEnum(DatabaseProvider)
  provider: DatabaseProvider;

  @ApiProperty({
    description: 'Full connection string / URI including credentials',
    example: 'postgres://user:pass@localhost:5432/postgres',
  })
  @IsString()
  @IsNotEmpty()
  connectionString: string;
}
