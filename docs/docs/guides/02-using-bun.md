import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Using Bun

[Bun](https://bun.sh) can be used as a test runner and/or package manager. It can be used as a package manager in combination with any other test runner, or as a test runner in combination with any other package manager.

## Installing

Installing Bun is as simple as running:

```shell
curl -fsSL https://bun.sh/install | bash
```

You can also check out the official [Bun installation documentation](https://bun.sh/docs/installation) for more information.

## As a test runner

### TypeScript

To get started with Bun as a test runner with TypeScript, install the `@types/bun` package using your preferred package manager:

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

```json
{
  "include": ["./**/*.ts"],
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
  }
}
```

Then, add a `test` script to your `package.json`:

```json
{
  "scripts": {
    "test": "tsc && bun test"
  }
}
```

Running `tsc` is optional, but it is recommended to catch any TypeScript errors before running your tests.

And that's it! Bun will automatically detect the `tsconfig.json` file and use it to compile your TypeScript files.

You can also check out the official [Bun documentation for TypeScript](https://bun.sh/docs/typescript) for more information.

### JavaScript

Add a `test` script to your `package.json`:

```json
{
  "scripts": {
    "test": "bun test"
  }
}
```

### Writing tests

Bun tests are very similar to tests written with [Jest](https://jestjs.io), [Jasmine](https://jasmine.github.io), or [Vitest](https://vitest.dev) so they will feel very familiar to developers who have used these frameworks before.

The basic skeleton of all PicJS tests written with Bun will look something like this:

```typescript
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
    pic = await PocketIc.create();

    // Setup the canister and actor
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });

    // Save the actor and canister ID for use in tests
    actor = fixture.actor;
    canisterId = fixture.canisterId;
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

PicJS leverages a [`postinstall`](https://docs.npmjs.com/cli/v9/using-npm/scripts#npm-install) script to download the `pocket-ic` binary. This is done to avoid bundling the binary with the library. If you are using [bun](https://bun.sh) to manage your project's dependencies, then you will need to add `@hadronous/pic` as a [trusted dependency](https://bun.sh/docs/install/lifecycle#trusteddependencies) in your `package.json`:

```json
{
  "trustedDependencies": ["@hadronous/pic"]
}
```
