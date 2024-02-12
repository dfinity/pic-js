import { chmodSync, createWriteStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IS_LINUX = process.platform === 'linux';
const PLATFORM = IS_LINUX ? 'x86_64-linux' : 'x86_64-darwin';
const VERSION = '3.0.0';
const DOWNLOAD_PATH = `https://github.com/dfinity/pocketic/releases/download/${VERSION}/pocket-ic-${PLATFORM}.gz`;

const TARGET_PATH = resolve(__dirname, 'pocket-ic');

async function downloadPicBinary() {
  const response = await fetch(DOWNLOAD_PATH);

  await pipeline(response.body, createGunzip(), createWriteStream(TARGET_PATH));

  chmodSync(TARGET_PATH, 0o700);
}

downloadPicBinary();
