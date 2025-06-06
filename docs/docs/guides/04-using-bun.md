import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Using Bun

[Bun](https://bun.sh) can be used as a test runner and/or package manager. It can be used as a package manager in combination with any other test runner, or as a test runner in combination with any other package manager.

## Installing

Installing [Bun](https://bun.sh) is as simple as running:

```shell
curl -fsSL https://bun.sh/install | bash
```

You can also check out the official [Bun installation documentation](https://bun.sh/docs/installation) for more information.

## As a test runner

### Installation

To get started with [Bun](https://bun.sh) as a test runner, install the `@types/bun` package using your preferred package manager:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```shell
    npm i -D @types/bun
    ```
  </TabItem>

  <TabItem value="pnpm" label="pnpm">
    ```shell
    pnpm i -D @types/bun
    ```
  </TabItem>

  <TabItem value="yarn" label="yarn">
    ```shell
    yarn add -D @types/bun
    ```
  </TabItem>

  <TabItem value="bun" label="bun">
    ```shell
    bun add -d @types/bun
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

Then, add a `test` script to your `package.json`:

```json title="package.json"
{
  "scripts": {
    "test": "tsc && bun test"
  }
}
```

Running `tsc` is optional, but it is recommended to catch any TypeScript errors before running your tests.

You can also check out the official [Bun documentation for TypeScript](https://bun.sh/docs/typescript) for more information.

### Global test setup

The PocketIC server needs to be started before running tests and stopped once they're finished running. This can be done by creating a `global-setup.ts` file in your project's root directory:

```ts title="global-setup.ts"
import { beforeAll, afterAll } from 'bun:test';
import { PocketIcServer } from '@dfinity/pic';

let pic: PocketIcServer | undefined;

beforeAll(async () => {
  pic = await PocketIcServer.start();
  const url = pic.getUrl();

  process.env.PIC_URL = url;
});

afterAll(async () => {
  await pic?.stop();
});
```

This file can be configured to run with `bun test` by creating a `bunfig.toml` file in your project's root directory:

```toml title="bunfig.toml"
[test]
preload = ["./global-setup.ts"]
```

To improve the type-safety of using `process.env.PIC_URL`, add a `types.d.ts` file in your project's root directory:

```ts title="types.d.ts"
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PIC_URL: string;
    }
  }
}

export {};
```

### Writing tests

[Bun](https://bun.sh) tests are very similar to tests written with [Jest](https://jestjs.io), [Jasmine](https://jasmine.github.io), or [Vitest](https://vitest.dev) so they will feel very familiar to developers who have used these frameworks before.

The basic skeleton of all PicJS tests written with [Bun](https://bun.sh) will look something like this:

```ts title="tests/example.spec.ts"
// Import Bun testing globals
import { beforeEach, describe, expect, it } from 'bun:test';

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
    pic = await PocketIc.create(process.env.PIC_URL);

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

You can also check out the official [Bun test runner documentation](https://bun.sh/docs/cli/test) for more information on writing tests.

## As a package manager

PicJS leverages a [`postinstall`](https://docs.npmjs.com/cli/v9/using-npm/scripts#npm-install) script to download the `pocket-ic` binary. This is done to avoid bundling the binary with the library. If you are using [bun](https://bun.sh) to manage your project's dependencies, then you will need to add `@dfinity/pic` as a [trusted dependency](https://bun.sh/docs/install/lifecycle#trusteddependencies) in your `package.json`:

```json title="package.json"
{
  "trustedDependencies": ["@dfinity/pic"]
}
```
