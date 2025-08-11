import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BackupModule } from './backup/backup.module';
import { ConnectionModule } from './connection/connection.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { APP_FILTER } from '@nestjs/core';
import { GrapghQLExceptionFilter } from '@/common/filters/exception.filter';
import { PubSubModule } from '@/common/subscription/pubsub.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      introspection: true,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: false,
      includeStacktraceInErrorResponses: false,
      subscriptions: {
        'graphql-ws': true,
      },
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      // csrfPrevention: false,
    }),
    BackupModule,
    ConnectionModule,
    PubSubModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GrapghQLExceptionFilter,
    },
  ],
})
export class AppModule {}
