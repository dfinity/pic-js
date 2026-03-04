import { createHash } from 'node:crypto';

export function splitIntoChunks(
  wasm: Uint8Array,
  chunkSize: number,
): Uint8Array[] {
  const chunks: Uint8Array[] = [];

  for (let offset = 0; offset < wasm.byteLength; offset += chunkSize) {
    chunks.push(wasm.subarray(offset, offset + chunkSize));
  }

  return chunks;
}

export function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(data).digest());
}
