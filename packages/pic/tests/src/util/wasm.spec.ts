import { createHash } from 'node:crypto';
import { splitIntoChunks, sha256 } from '../../../src/util/wasm';

describe('splitIntoChunks', () => {
  it('should return a single chunk for data smaller than chunkSize', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const chunks = splitIntoChunks(data, 10);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(data);
  });

  it('should return a single chunk for data equal to chunkSize', () => {
    const data = new Uint8Array(100);
    const chunks = splitIntoChunks(data, 100);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(data);
  });

  it('should split data into multiple even chunks', () => {
    const data = new Uint8Array(300);
    data.fill(0xab);
    const chunks = splitIntoChunks(data, 100);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].byteLength).toBe(100);
    expect(chunks[1].byteLength).toBe(100);
    expect(chunks[2].byteLength).toBe(100);
  });

  it('should handle a remainder chunk', () => {
    const data = new Uint8Array(250);
    data.fill(0xcd);
    const chunks = splitIntoChunks(data, 100);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].byteLength).toBe(100);
    expect(chunks[1].byteLength).toBe(100);
    expect(chunks[2].byteLength).toBe(50);
  });

  it('should preserve data integrity across chunks', () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      data[i] = i;
    }

    const chunks = splitIntoChunks(data, 100);
    const reassembled = new Uint8Array(256);
    let offset = 0;
    for (const chunk of chunks) {
      reassembled.set(chunk, offset);
      offset += chunk.byteLength;
    }

    expect(reassembled).toEqual(data);
  });

  it('should throw for non-positive chunkSize', () => {
    const data = new Uint8Array([1, 2, 3]);

    expect(() => splitIntoChunks(data, 0)).toThrow(
      'chunkSize must be positive',
    );
    expect(() => splitIntoChunks(data, -1)).toThrow(
      'chunkSize must be positive',
    );
  });

  it('should handle empty data', () => {
    const data = new Uint8Array(0);
    const chunks = splitIntoChunks(data, 100);

    expect(chunks).toHaveLength(0);
  });
});

describe('sha256', () => {
  it('should produce a 32-byte hash', () => {
    const data = new Uint8Array([1, 2, 3]);
    const hash = sha256(data);

    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.byteLength).toBe(32);
  });

  it('should match Node.js crypto output', () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const expected = new Uint8Array(createHash('sha256').update(data).digest());

    expect(sha256(data)).toEqual(expected);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = sha256(new Uint8Array([1]));
    const hash2 = sha256(new Uint8Array([2]));

    expect(hash1).not.toEqual(hash2);
  });

  it('should produce the same hash for the same input', () => {
    const data = new Uint8Array(1_000_000);
    data.fill(0xff);

    expect(sha256(data)).toEqual(sha256(data));
  });
});
