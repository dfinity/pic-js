# Examples

All examples are written in [TypeScript](https://www.typescriptlang.org/) with [Jest](https://jestjs.io/) as the test runner,
but `@hadronous/pic` can be used with JavaScript and any other testing runner, such as [NodeJS](https://nodejs.org/dist/latest-v20.x/docs/api/test.html), [bun](https://bun.sh/docs/cli/test) or [Mocha](https://mochajs.org/).

## Setup

- Install [bun](https://bun.sh/) OR install [pnpm](https://pnpm.io/installation)
  - Replace `bun` with `pnpm` in any subsequent commands if you choose to use `pnpm`.
- Install dependencies:

  ```bash
  bun i
  ```

- [Counter](./counter/README.md)
  This example demonstrates how to work with a simple canister as well as init arguments, canister upgrades and WASM reinstallation.
- [Clock](./clock/README.md)
  This example demonstrates how to work with the replica's system time, canister timers as well as checking for canister existence and cycle management.
- [Todo](./todo/README.md)
  This example demonstrates how to work with more complex canisters, identities, canister upgrades, and stable memory management.
- [Multicanister](./multicanister/README.md)
  This example demonstrates how to work with multiple canisters and multiple subnets.
- [NNS Proxy](./nns_proxy/README.md)
  This example demonstrates how to work with an NNS state directory.
- [Google Search](./google_search/README.md)
  This example demonstrates how to mock HTTPS Outcalls.
