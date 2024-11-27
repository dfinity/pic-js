import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { PocketIcClient } from './pocket-ic-client';
import { ActorInterface, ActorMethod } from './pocket-ic-actor';
import { decodeCandid } from './util';

export interface DeferredActorMethod<
  Args extends unknown[] = unknown[],
  Ret = unknown,
> {
  (...args: Args): Promise<() => Promise<Ret>>;
}

export type DeferredActorInterface<
  T extends ActorInterface<T> = ActorInterface,
> = {
  [K in keyof T]: DeferredActorMethod<Parameters<T[K]>, ReturnType<T[K]>>;
};

export type DeferredActor<T extends ActorInterface<T> = ActorInterface> =
  DeferredActorInterface<T> & {
    /**
     * @ignore
     */
    new (): DeferredActor<T>;

    /**
     * Set a Principal to be used as sender for all calls to the canister.
     *
     * @param principal The Principal to set.
     *
     * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
     *
     * @example
     * ```ts
     * import { PocketIc } from '@hadronous/pic';
     * import { Principal } from '@dfinity/principal';
     * import { _SERVICE, idlFactory } from '../declarations';
     *
     * const wasmPath = resolve('..', '..', 'canister.wasm');
     *
     * const pic = await PocketIc.create();
     * const fixture = await pic.setupCanister<_SERVICE>(idlFactory, wasmPath);
     * const { actor } = fixture;
     *
     * actor.setPrincipal(Principal.anonymous());
     * ```
     */
    setPrincipal(principal: Principal): void;

    /**
     * Set a Principal to be used as sender for all calls to the canister.
     * This is a convenience method over {@link setPrincipal} that accepts an
     * Identity and internally extracts the Principal.
     *
     * @param identity The identity to set.
     *
     * @see [Identity](https://agent-js.icp.xyz/agent/interfaces/Identity.html)
     * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
     *
     * @example
     * ```ts
     * import { PocketIc } from '@hadronous/pic';
     * import { AnonymousIdentity } from '@dfinity/agent';
     * import { _SERVICE, idlFactory } from '../declarations';
     *
     * const wasmPath = resolve('..', '..', 'canister.wasm');
     *
     * const pic = await PocketIc.create();
     * const fixture = await pic.setupCanister<_SERVICE>(idlFactory, wasmPath);
     * const { actor } = fixture;
     *
     * actor.setIdentity(new AnonymousIdentity());
     * ```
     */
    setIdentity(identity: Identity): void;
  };

export function createDeferredActorClass<
  T extends ActorInterface<T> = ActorInterface,
>(
  interfaceFactory: IDL.InterfaceFactory,
  canisterId: Principal,
  pocketIcClient: PocketIcClient,
): DeferredActor<T> {
  const service = interfaceFactory({ IDL });
  let sender: Principal | null = null;

  function createDeferredActorMethod(
    method: string,
    func: IDL.FuncClass,
  ): ActorMethod {
    return async function (...args) {
      const arg = IDL.encode(func.argTypes, args);
      const sender = getSender();

      const messageId = await pocketIcClient.submitCall({
        canisterId,
        sender,
        method,
        payload: new Uint8Array(arg),
      });

      return function () {
        return new Promise(async resolve => {
          const res = await pocketIcClient.awaitCall(messageId);
          const decodedRes = decodeCandid(func.retTypes, res.body);

          return resolve(decodedRes);
        });
      };
    };
  }

  function getSender(): Principal {
    return sender ?? Principal.anonymous();
  }

  const DeferredActor = function () {};

  DeferredActor.prototype.setPrincipal = function (newSender: Principal): void {
    sender = newSender;
  };

  DeferredActor.prototype.setIdentity = function (identity: Identity): void {
    sender = identity.getPrincipal();
  };

  service._fields.forEach(([methodName, func]) => {
    DeferredActor.prototype[methodName] = createDeferredActorMethod(
      methodName,
      func,
    );
  });

  return DeferredActor as never as DeferredActor<T>;
}
