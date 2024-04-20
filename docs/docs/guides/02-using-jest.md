import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Using Jest

[Jest](https://jestjs.io) is a JavaScript testing framework that is widely used in the JavaScript community. It is recommended for beginners because it has the largest community and is the most widely used. Jest is also the officially supported test runner for PicJS.

## Setup

To get started with [Jest](https://jestjs.io), install the relevant packages using your preferred package manager:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```shell
    npm i -D jest @types/jest @types/node ts-jest
    ```
  </TabItem>

  <TabItem value="pnpm" label="pnpm">
    ```shell
    pnpm i -D jest @types/jest @types/node ts-jest
    ```
  </TabItem>

  <TabItem value="yarn" label="yarn">
    ```shell
    yarn add -D jest @types/jest @types/node ts-jest
    ```
  </TabItem>

  <TabItem value="bun" label="bun">
    ```shell
    bun add -d jest @types/jest @types/node ts-jest
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
    "types": ["jest", "node"],

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
  "include": [
    "./src/**/*.ts",
    "./global-setup.ts",
    "./global-teardown.ts",
    "./types.d.ts"
  ]
}
```

Create a `jest.config.ts` file:

```ts title="jest.config.ts"
import type { Config } from 'jest';

const config: Config = {
  watch: false,
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
};

export default config;
```

You can also check out the official the [`ts-jest` documentation](https://kulshekhar.github.io/ts-jest/docs/) for more information on configuring this file.

Then, add a `test` script to your `package.json`:

```json title="package.json"
{
  "scripts": {
    "test": "jest"
  }
}
```

The PocketIC server needs to be started before running tests and stopped once they're finished running. This can be done by creating `global-setup.ts` and `global-teardown.ts` files in your project's root directory:

```ts title="global-setup.ts"
import { PocketIcServer } from '@hadronous/pic';

module.exports = async function (): Promise<void> {
  const pic = await PocketIcServer.start();
  const url = pic.getUrl();

  process.env.PIC_URL = url;
  global.__PIC__ = pic;
};
```

```ts title="global-teardown.ts"
module.exports = async function () {
  await global.__PIC__.stop();
};
```

To improve type-safety for `process.env.PIC_URL` and `global.__PIC__`, create a `types.d.ts` file:

```ts title="types.d.ts"
import { PocketIcServer } from '@hadronous/pic';

declare global {
  declare var __PIC__: PocketIcServer;

  namespace NodeJS {
    interface ProcessEnv {
      PIC_URL: string;
    }
  }
}
```

## Writing tests

[Jest](https://jestjs.io) tests are very similar to tests written with [Jasmine](https://jasmine.github.io), or [Vitest](https://vitest.dev) so they will feel very familiar to developers who have used these frameworks before.

The basic skeleton of all PicJS tests written with [Jest](https://jestjs.io) will look something like this:

```ts title="tests/example.spec.ts"
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

You can also check out the official [Jest getting started documentation](https://jestjs.io/docs/getting-started) for more information on writing tests.
