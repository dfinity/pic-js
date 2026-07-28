import { PocketIcServer } from '../../src';
import { BinNotFoundError } from '../../src/error';

describe('PocketIcServer', () => {
  const originalPocketIcBin = process.env.POCKET_IC_BIN;

  afterEach(() => {
    if (originalPocketIcBin === undefined) {
      delete process.env.POCKET_IC_BIN;
    } else {
      process.env.POCKET_IC_BIN = originalPocketIcBin;
    }
  });

  it('should use the binary from the binPath option', async () => {
    await expect(
      PocketIcServer.start({ binPath: '/non-existent/bin-path/pocket-ic' }),
    ).rejects.toThrow(new BinNotFoundError('/non-existent/bin-path/pocket-ic'));
  });

  it('should use the binary from the POCKET_IC_BIN environment variable', async () => {
    process.env.POCKET_IC_BIN = '/non-existent/env-path/pocket-ic';

    await expect(PocketIcServer.start()).rejects.toThrow(
      new BinNotFoundError('/non-existent/env-path/pocket-ic'),
    );
  });

  it('should prefer the binPath option over the POCKET_IC_BIN environment variable', async () => {
    process.env.POCKET_IC_BIN = '/non-existent/env-path/pocket-ic';

    await expect(
      PocketIcServer.start({ binPath: '/non-existent/bin-path/pocket-ic' }),
    ).rejects.toThrow(new BinNotFoundError('/non-existent/bin-path/pocket-ic'));
  });
});
