import { Query, Resolver, Subscription } from '@nestjs/graphql';
import { BackupLog } from './dto/backup-log.dto';
import { PUB_SUB } from '@/common/subscription/pubsub.module';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Resolver()
export class BackupResolver {
  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {}

  @Query(() => String, { name: '_serviceInfo' })
  serviceInfo() {
    return 'Backup Service v1.0';
  }

  @Subscription(() => BackupLog, { name: 'backupLogs' })
  backupLogs() {
    return this.pubSub.asyncIterableIterator('backupLogs');
  }

  @Subscription(() => BackupLog, { name: 'restoreLogs' })
  restoreLogs() {
    return this.pubSub.asyncIterableIterator('restoreLogs');
  }
}
