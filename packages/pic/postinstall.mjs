import { chmodSync, createWriteStream, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IS_LINUX = process.platform === 'linux';
const IS_DARWIN = process.platform === 'darwin';
if (!IS_LINUX && !IS_DARWIN) {
  throw new Error(
    `Unsupported platform: ${process.platform}. Only linux and darwin are supported.`,
  );
}
const IS_ARM = process.arch === 'arm64' || process.arch === 'aarch64';
const ARCH = IS_ARM ? 'arm64' : 'x86_64';
const PLATFORM = IS_LINUX ? `${ARCH}-linux` : `${ARCH}-darwin`;
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
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    // No version file; use default.
  }

  const colonIdx = versionSpec.indexOf(':');
  if (colonIdx === -1) {
    throw new Error(
      `.pocket-ic-version: invalid format "${versionSpec}". Expected "package:<version>" or "ic:<version>".`,
    );
  }

  const source = versionSpec.slice(0, colonIdx);
  const version = versionSpec.slice(colonIdx + 1).trim();

  if (!version) {
    throw new Error(
      `.pocket-ic-version: missing version in "${versionSpec}". Expected "package:<version>" or "ic:<version>".`,
    );
  }

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

  if (!response.ok) {
    throw new Error(
      `Failed to download pocket-ic from ${downloadUrl}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error(
      `Failed to download pocket-ic from ${downloadUrl}: response body is empty`,
    );
  }

  await pipeline(response.body, createGunzip(), createWriteStream(TARGET_PATH));

  chmodSync(TARGET_PATH, 0o700);
}

downloadPicBinary();
