# Multi canister

This example demonstrates how to work with multiple canisters. It shows how to create and deploy three canisters, two on the same subnet and a third on a different subnet, using init args to inform the main canister of the other canisters' IDs.

Build the canisters:

```shell
bun build:multicanister
```

Run the tests:

```shell
bun test:multicanister
```
