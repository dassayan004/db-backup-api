export interface BackupStrategy<TDto = any> {
  runBackup(dto: TDto): Promise<string>; // returns path to created zip
  // /**
  //  * Restores a database from a backup file.
  //  * @param dto Connection and other restore-related details
  //  * @param backupFilePath Path to the uploaded backup file (.zip or .sql)
  //  * @param targetDatabaseName Name of the database to restore into (can be new or existing)
  //  */
  // runRestore?(
  //   dto: TDto,
  //   backupFilePath: string,
  //   targetDatabaseName: string,
  // ): Promise<void>;
}
