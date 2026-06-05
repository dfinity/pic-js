import { chmodSync, createWriteStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IS_LINUX = process.platform === 'linux';
const IS_ARM = process.arch === 'arm64' || process.arch === 'aarch64';
const ARCH = IS_ARM ? 'arm64' : 'x86_64';
const PLATFORM = IS_LINUX ? `${ARCH}-linux` : `${ARCH}-darwin`;
const VERSION = '13.0.0';
const DOWNLOAD_PATH = `https://github.com/dfinity/pocketic/releases/download/${VERSION}/pocket-ic-${PLATFORM}.gz`;

const TARGET_PATH = resolve(__dirname, 'pocket-ic');

async function downloadPicBinary() {
  const response = await fetch(DOWNLOAD_PATH);

  await pipeline(response.body, createGunzip(), createWriteStream(TARGET_PATH));

  chmodSync(TARGET_PATH, 0o700);
}

downloadPicBinary();
