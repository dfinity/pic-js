import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const PIC_URL_FILE = join(tmpdir(), 'pic-test-url.txt');

export async function writePicUrl(url: string): Promise<void> {
  await writeFile(PIC_URL_FILE, url);
}

export async function readPicUrl(): Promise<string | null> {
  try {
    return await readFile(PIC_URL_FILE, 'utf-8');
  } catch {
    return null;
  }
}

export async function deletePicUrl(): Promise<void> {
  try {
    await unlink(PIC_URL_FILE);
  } catch {
    // Ignore errors if file doesn't exist
  }
} 