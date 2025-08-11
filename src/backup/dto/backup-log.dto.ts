import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum BackupStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

registerEnumType(BackupStatus, {
  name: 'BackupStatus',
  description: 'Status of the backup process',
});
@ObjectType()
export class BackupLog {
  @Field(() => BackupStatus)
  status: BackupStatus;

  @Field()
  message: string;
}

export interface BackupLogsPayload {
  backupLogs: BackupLog;
}
