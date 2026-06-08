import { Cbor } from '@icp-sdk/core/agent';
import { PocketIc, SubnetStateType, generateRandomIdentity } from '../../src';

// A minimal Candid-encoded empty argument tuple (`DIDL` magic + 0 type/arg counts).
const EMPTY_CANDID_ARG = new Uint8Array([0x44, 0x49, 0x44, 0x4c, 0x00, 0x00]);

// Comfortably within the replica's 5 minute MAX_INGRESS_TTL, measured from the
// instance's own clock so the only validation failure is the missing signature.
const INGRESS_EXPIRY_OFFSET_NANOS = 4n * 60n * 1_000_000_000n;
const NANOS_PER_MILLISECOND = 1_000_000n;

/**
 * POSTs a deliberately invalid ingress message to the instance's mainnet-like
 * `/api/v2/.../call` endpoint: a non-anonymous sender with no `sender_pubkey`
 * or `sender_sig`. The replica's ingress validation rejects this with a missing
 * signature error unless ingress validation has been disabled.
 */
async function submitUnsignedNonAnonymousCall(
  pic: PocketIc,
  gatewayPort: number,
): Promise<Response> {
  const canisterId = await pic.getDefaultEffectiveCanisterId();
  const sender = generateRandomIdentity().getPrincipal();
  expect(sender.isAnonymous()).toBe(false);

  const instanceTimeMs = await pic.getTime();
  const ingressExpiry =
    BigInt(instanceTimeMs) * NANOS_PER_MILLISECOND +
    INGRESS_EXPIRY_OFFSET_NANOS;

  // An anonymous envelope (no sender_pubkey / sender_sig) carrying a
  // non-anonymous sender. This is exactly what ingress validation forbids.
  const envelope = {
    content: {
      request_type: 'call',
      canister_id: canisterId,
      method_name: 'get_time',
      arg: EMPTY_CANDID_ARG,
      sender,
      ingress_expiry: ingressExpiry,
    },
  };

  return await fetch(
    `http://localhost:${gatewayPort}/api/v2/canister/${canisterId.toText()}/call`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/cbor' },
      body: Cbor.encode(envelope),
    },
  );
}

describe('CreateInstanceOptions.disableIngressValidation', () => {
  it('rejects an unsigned non-anonymous call when validation is enabled', async () => {
    const pic = await PocketIc.create(process.env.PIC_URL, {
      nns: { state: { type: SubnetStateType.New } },
      application: [{ state: { type: SubnetStateType.New } }],
    });
    try {
      const gatewayPort = await pic.makeLive();
      const res = await submitUnsignedNonAnonymousCall(pic, gatewayPort);

      // The replica refuses the message because the non-anonymous sender did
      // not provide a signature.
      expect(res.ok).toBe(false);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    } finally {
      await pic.stopLive();
      await pic.tearDown();
    }
  });

  it('accepts an unsigned non-anonymous call when validation is disabled', async () => {
    const pic = await PocketIc.create(process.env.PIC_URL, {
      nns: { state: { type: SubnetStateType.New } },
      application: [{ state: { type: SubnetStateType.New } }],
      disableIngressValidation: true,
    });
    try {
      const gatewayPort = await pic.makeLive();
      const res = await submitUnsignedNonAnonymousCall(pic, gatewayPort);

      // With validation disabled the same forbidden message is accepted into
      // the ingress pool.
      expect(res.ok).toBe(true);
    } finally {
      await pic.stopLive();
      await pic.tearDown();
    }
  });
});
