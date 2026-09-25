import { createServer } from 'node:net';
import { Principal } from '@icp-sdk/core/principal';
import { IcpFeaturesConfig, PocketIc } from '../../src';

const II_BACKEND_ID = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
const II_FRONTEND_ID = 'uqzsh-gqaaa-aaaaq-qaada-cai';
const NNS_DAPP_ID = 'qoctq-giaaa-aaaaa-aaaea-cai';

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('Could not determine a free port')),
      );
    });
  });
}

async function fetchFrontend(
  canisterId: string,
  gatewayPort: number,
): Promise<Response> {
  return await fetch(`http://${canisterId}.localhost:${gatewayPort}/`);
}

async function canisterExists(
  pic: PocketIc,
  canisterId: string,
): Promise<boolean> {
  return await pic
    .getControllers(Principal.fromText(canisterId))
    .then(() => true)
    .catch(() => false);
}

describe('httpGateway', () => {
  it('deploys and serves Internet Identity', async () => {
    const pic = await PocketIc.create(process.env.PIC_URL, {
      httpGateway: {},
      icpFeatures: { ii: IcpFeaturesConfig.DefaultConfig },
    });

    try {
      expect(await canisterExists(pic, II_BACKEND_ID)).toBe(true);

      const gatewayPort = await pic.makeLive();
      const res = await fetchFrontend(II_FRONTEND_ID, gatewayPort);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    } finally {
      await pic.stopLive();
      await pic.tearDown();
    }
  });

  it('deploys and serves the NNS dapp', async () => {
    const config = IcpFeaturesConfig.DefaultConfig;
    const pic = await PocketIc.create(process.env.PIC_URL, {
      httpGateway: {},
      icpFeatures: {
        cyclesMinting: config,
        icpToken: config,
        nnsGovernance: config,
        sns: config,
        ii: config,
        nnsUi: config,
      },
    });

    try {
      const gatewayPort = await pic.makeLive();
      const res = await fetchFrontend(NNS_DAPP_ID, gatewayPort);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    } finally {
      await pic.stopLive();
      await pic.tearDown();
    }
  });

  it('uses the gateway created with the instance when going live', async () => {
    const port = await getFreePort();
    const pic = await PocketIc.create(process.env.PIC_URL, {
      httpGateway: { port },
      icpFeatures: { ii: IcpFeaturesConfig.DefaultConfig },
    });

    try {
      expect(await pic.makeLive()).toBe(port);

      await pic.stopLive();
      expect(await pic.makeLive()).toBe(port);

      const res = await fetchFrontend(II_FRONTEND_ID, port);
      expect(res.status).toBe(200);
    } finally {
      await pic.stopLive();
      await pic.tearDown();
    }
  });

  it.each(['ii', 'nnsUi'] as const)(
    'rejects the %s feature without an HTTP gateway',
    async feature => {
      await expect(
        PocketIc.create(process.env.PIC_URL, {
          icpFeatures: { [feature]: IcpFeaturesConfig.DefaultConfig },
        }),
      ).rejects.toThrow(
        `The \`${feature}\` ICP feature requires an HTTP gateway.`,
      );
    },
  );
});
