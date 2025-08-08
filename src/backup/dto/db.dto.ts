import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class RelationalConnectionDto {
  @ApiProperty({ example: 'localhost' })
  @IsString({ message: 'Host must be a string' })
  @IsNotEmpty({ message: 'Host is required' })
  host: string;

  @ApiProperty({ example: 5432 })
  @IsNumber({}, { message: 'Port must be a number' })
  @IsNotEmpty({ message: 'Port is required' })
  port: number;

  @ApiProperty({ example: 'mydb' })
  @IsString({ message: 'Database must be a string' })
  @IsNotEmpty({ message: 'Database is required' })
  database: string;

  @ApiProperty({ example: 'myuser' })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @ApiProperty({ example: 'mypassword' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({ description: 'Enable SSL connection', example: false })
  @IsOptional()
  @IsBoolean({ message: 'ssl must be a boolean' })
  ssl?: boolean;

  @ApiPropertyOptional({
    description: 'Path to SSL certificate (if ssl is true and cert is needed)',
    example: '/path/to/cert.pem',
  })
  @IsOptional()
  @ValidateIf((o) => o.ssl === true)
  @IsString({ message: 'sslCert must be a string' })
  sslCert?: string;

  @ApiPropertyOptional({
    description: 'Enable channel binding for enhanced security (if supported)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  channelBinding?: boolean;
}

export class PostgresConnectionDto extends RelationalConnectionDto {}
export class MysqlConnectionDto extends RelationalConnectionDto {}
export class MssqlConnectionDto extends RelationalConnectionDto {}

export class MongoConnectionDto {
  @ApiProperty({ example: 'mongodb://localhost:27017/' })
  @IsString({ message: 'Connection string must be a string' })
  @IsNotEmpty({ message: 'Connection string is required' })
  connectionString: string;

  @ApiProperty({
    description:
      'Database name to backup (can be parsed from connectionString if omitted)',
    example: 'mydb',
  })
  @IsString({ message: 'Database must be a string' })
  @IsNotEmpty({ message: 'Database is required' })
  database: string;
}
