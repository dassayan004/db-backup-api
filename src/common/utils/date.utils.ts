export function getFormattedTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/[:.]/g, '-')
    .replace(/Z$/, '');
}
