// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';

// @Module({
//   imports: [
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         type: 'postgres',
//         host: configService.getOrThrow('POSTGRES_HOST'),
//         port: configService.getOrThrow<number>('POSTGRES_PORT'),
//         username: configService.getOrThrow('POSTGRES_USER'),
//         password: configService.getOrThrow('POSTGRES_PASSWORD'),
//         database: configService.getOrThrow('POSTGRES_DB'),
//         entities: ['dist/**/*.entity.js'],
//         ssl: true,
//         synchronize: true,
//       }),
//     }),
//   ],
// })
// export class DatabaseModule {}
