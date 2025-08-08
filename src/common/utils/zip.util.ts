import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

export function zipFile(srcFilePath: string, zipPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', () => reject);

    archive.pipe(output);
    archive.file(srcFilePath, { name: path.basename(srcFilePath) });
    archive.finalize();
  });
}

export function zipDirectory(srcDir: string, zipPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(zipPath));
    archive.on('error', () => reject);

    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();
  });
}
