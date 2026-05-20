import { chmodSync, createWriteStream, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IS_LINUX = process.platform === 'linux';
const PLATFORM = IS_LINUX ? 'x86_64-linux' : 'x86_64-darwin';
const DEFAULT_VERSION = 'package:13.0.0';

const TARGET_PATH = resolve(__dirname, 'pocket-ic');

function resolveDownloadUrl() {
  // INIT_CWD is set by npm/pnpm/yarn to the directory where install was invoked,
  // i.e. the dependent project root where .pocket-ic-version would live.
  const projectRoot = process.env.INIT_CWD ?? process.cwd();
  const versionFilePath = join(projectRoot, '.pocket-ic-version');

  let versionSpec = DEFAULT_VERSION;
  try {
    versionSpec = readFileSync(versionFilePath, 'utf8').trim();
  } catch {
    // No version file; use default.
  }

  const colonIdx = versionSpec.indexOf(':');
  if (colonIdx === -1) {
    throw new Error(
      `.pocket-ic-version: invalid format "${versionSpec}". Expected "package:<version>" or "ic:<version>".`,
    );
  }

  const source = versionSpec.slice(0, colonIdx);
  const version = versionSpec.slice(colonIdx + 1);

  if (source === 'package') {
    return `https://github.com/dfinity/pocketic/releases/download/${version}/pocket-ic-${PLATFORM}.gz`;
  } else if (source === 'ic') {
    return `https://github.com/dfinity/ic/releases/download/${version}/pocket-ic-${PLATFORM}.gz`;
  } else {
    throw new Error(
      `.pocket-ic-version: unknown source "${source}". Expected "package" or "ic".`,
    );
  }
}

async function downloadPicBinary() {
  const downloadUrl = resolveDownloadUrl();
  const response = await fetch(downloadUrl);

  await pipeline(response.body, createGunzip(), createWriteStream(TARGET_PATH));

  chmodSync(TARGET_PATH, 0o700);
}

downloadPicBinary();
