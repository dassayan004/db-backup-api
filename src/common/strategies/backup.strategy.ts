export interface BackupStrategy<TDto = any> {
  runBackup(dto: TDto): Promise<string>; // returns path to created zip
  // optionally add runRestore later
}
