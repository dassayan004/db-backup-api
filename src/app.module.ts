import { Module } from '@nestjs/common';
import { BackupModule } from './backup/backup.module';
import { ConnectionModule } from './connection/connection.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { APP_FILTER } from '@nestjs/core';
import { GrapghQLExceptionFilter } from '@/common/filters/exception.filter';
import { PubSubModule } from '@/common/subscription/pubsub.module';
import { ConfigModule } from '@/common/config/config.module';
import { ConfigService } from '@nestjs/config';
import { ConfigSchema } from './common/config/schema';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ConfigSchema, true>) => ({
        introspection: true,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: false,
        includeStacktraceInErrorResponses: false,
        subscriptions: {
          'graphql-ws': true,
        },
        plugins: [
          configService.getOrThrow('NODE_ENV') === 'production'
            ? ApolloServerPluginLandingPageProductionDefault()
            : ApolloServerPluginLandingPageLocalDefault(),
        ],
        // csrfPrevention: false,
      }),
    }),
    BackupModule,
    ConnectionModule,
    PubSubModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GrapghQLExceptionFilter,
    },
  ],
})
export class AppModule {}
