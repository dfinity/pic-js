# Examples

All examples are written in [TypeScript](https://www.typescriptlang.org/) with [Jest](https://jestjs.io/) or [Vitest](https://vitest.dev/) as the test runner,
but `@dfinity/pic` can be used with JavaScript and any other testing runner, such as [NodeJS](https://nodejs.org/dist/latest-v20.x/docs/api/test.html), [bun](https://bun.sh/docs/cli/test) or [Mocha](https://mochajs.org/).

## Setup

- Install [pnpm](https://pnpm.io/installation)
- Install dependencies:

  ```bash
  pnpm i
  ```

- Download the `pocket-ic` binary. `.npmrc` sets `ignore-scripts=true`, so the
  `postinstall` step that fetches it does not run on its own:

  ```bash
  pnpm run setup
  ```

- Build all examples:

  ```bash
  pnpm build:examples
  ```

- Test all examples:

  ```bash
  pnpm test:examples
  ```

- Build or test a single example:

  ```bash
  pnpm build:examples -- counter
  pnpm test:examples -- counter
  ```

Dependencies are always installed with pnpm so that `pnpm.overrides` and the
release-age policy apply. To run the suites with [bun](https://bun.sh/) instead,
keep the `pnpm i` above and replace `pnpm` with `bun` in the commands that follow.

## Examples

- [Counter](./counter/README.md)
  This example demonstrates how to work with a simple canister as well as init arguments, canister upgrades and WASM reinstallation.
- [Clock](./clock/README.md)
  This example demonstrates how to work with the replica's system time, canister timers as well as checking for canister existence and cycle management.
- [Todo](./todo/README.md)
  This example demonstrates how to work with more complex canisters, identities, canister upgrades, and stable memory management. It also shows how to use "live" mode with agent-js (in contrast to the pic-js actor).
- [Multicanister](./multicanister/README.md)
  This example demonstrates how to work with multiple canisters and multiple subnets.
- [ICP Features](./icp_features/README.md)
  This example demonstrates how to enable ICP features when creating a PocketIC instance.
- [NNS Proxy](./nns_proxy/README.md)
  This example demonstrates how to work with an NNS state directory.
- [Google Search](./google_search/README.md)
  This example demonstrates how to mock HTTPS Outcalls.
- [HTTP](./http/README.md)
  This example demonstrates how to use "live" mode with an HTTP canister.
