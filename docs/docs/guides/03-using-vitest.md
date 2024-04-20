import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Using Vitest

[Vitest](https://vitest.dev/) is a modern JavaScript testing framework that integrates with the [Vite](https://vitejs.dev/) bundler. It is recommended for developers that are already using [Vite](https://vitejs.dev/) or [Vitest](https://vitest.dev/) on their project.

## Setup

To get started with [Vitest](https://vitest.dev/), install the relevant packages using your preferred package manager:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```shell
    npm i -D vitest @types/node
    ```
  </TabItem>

  <TabItem value="pnpm" label="pnpm">
    ```shell
    pnpm i -D vitest @types/node
    ```
  </TabItem>

  <TabItem value="yarn" label="yarn">
    ```shell
    yarn add -D vitest @types/node
    ```
  </TabItem>

  <TabItem value="bun" label="bun">
    ```shell
    bun add -d vitest @types/node
    ```
  </TabItem>
</Tabs>

Create a `tsconfig.json` file:

```json title="tsconfig.json"
{
  "compilerOptions": {
    // enable latest features
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "allowJs": true, // allow importing `.js` from `.ts`
    "types": ["node"],

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    // Some stricter flags
    "useUnknownInCatchVariables": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "include": ["./src/**/*.ts", "./global-setup.ts", "./types.d.ts"]
}
```

The PocketIC server needs to be started before running tests and stopped once they're finished running. This can be done by creating a `global-setup.ts` file in your project's root directory:

```ts title="global-setup.ts"
import type { GlobalSetupContext } from 'vitest/node';
import { PocketIcServer } from '@hadronous/pic';

let pic: PocketIcServer | undefined;

export async function setup(ctx: GlobalSetupContext): Promise<void> {
  pic = await PocketIcServer.start();
  const url = pic.getUrl();

  ctx.provide('PIC_URL', url);
}

export async function teardown(): Promise<void> {
  await pic?.stop();
}
```

To improve type-safety for `ctx.provide('PIC_URL')` and (later) `inject('PIC_URL')`, create a `types.d.ts` file:

```typescript title="types.d.ts"
export declare module 'vitest' {
  export interface ProvidedContext {
    PIC_URL: string;
  }
}
```

Create a `vitest.config.ts` file:

```typescript title="vitest.config.ts"
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'examples/counter/tests',
    globalSetup: './global-setup.ts',
  },
});
```

## Writing tests

[Vitest](https://vitest.dev/) tests are very similar to tests written with [Jest](https://jestjs.io/) or [Jasmine](https://jasmine.github.io), so they will feel very familiar to developers who have used these frameworks before.

The basic skeleton of all PicJS tests written with [Vitest](https://vitest.dev/) will look something like this:

```typescript title="tests/example.spec.ts"
import { describe, beforeEach, afterEach, it, expect, inject } from 'vitest';

// Import generated types for your canister
import { type _SERVICE } from '../../declarations/backend/backend.did';

// Define the path to your canister's WASM file
export const WASM_PATH = resolve(
  import.meta.dir,
  '..',
  '..',
  'target',
  'wasm32-unknown-unknown',
  'release',
  'backend.wasm',
);

// The `describe` function is used to group tests together
// and is completely optional.
describe('Test suite name', () => {
  // Define variables to hold our PocketIC instance, canister ID,
  // and an actor to interact with our canister.
  let pic: PocketIc;
  let canisterId: Principal;
  let actor: Actor<_SERVICE>;

  // The `beforeEach` hook runs before each test.
  //
  // This can be replaced with a `beforeAll` hook to persist canister
  // state between tests.
  beforeEach(async () => {
    // create a new PocketIC instance
    pic = await PocketIc.create(inject('PIC_URL'));

    // Setup the canister and actor
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });

    // Save the actor and canister ID for use in tests
    actor = fixture.actor;
    canisterId = fixture.canisterId;
  });

  // The `afterEach` hook runs after each test.
  //
  // This should be replaced with an `afterAll` hook if you use
  // a `beforeAll` hook instead of a `beforeEach` hook.
  afterEach(async () => {
    // tear down the PocketIC instance
    await pic.tearDown();
  });

  // The `it` function is used to define individual tests
  it('should do something cool', async () => {
    const response = await actor.do_something_cool();

    expect(response).toEqual('cool');
  });
});
```

You can check out the official [Vitest documentation](https://vitest.dev/) for more information writing tests.
