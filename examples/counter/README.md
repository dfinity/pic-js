# Counter

This example demonstrates how to work with a simple canister as well as init arguments, canister upgrades and WASM reinstallation.

Start DFX:

```shell
dfx start --background
```

Create a new canister:

```shell
dfx bun create:counter
```

Build the counter canister:

```shell
bun build:counter
```

Run the counter tests:

```shell
bun test:counter
```
