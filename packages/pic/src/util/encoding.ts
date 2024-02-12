import { Principal } from '@dfinity/principal';

export function base64Encode(payload: Uint8Array): string {
  return Buffer.from(payload).toString('base64');
}

export function base64EncodePrincipal(principal: Principal): string {
  return base64Encode(principal.toUint8Array());
}

export function base64DecodePrincipal(payload: string): Principal {
  return Principal.fromUint8Array(base64Decode(payload));
}

export function base64Decode(payload: string): Uint8Array {
  return new Uint8Array(Buffer.from(payload, 'base64'));
}

export function hexDecode(payload: string): Uint8Array {
  return new Uint8Array(Buffer.from(payload, 'hex'));
}
