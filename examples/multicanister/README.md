# Multicanister

This example demonstrates inter-canister calls across multiple subnets. It deploys three canisters across two application subnets:

| Canister          | Subnet | Description                                              |
| ----------------- | ------ | -------------------------------------------------------- |
| **phonebook**     | A      | A simple contact storage canister                        |
| **multicanister** | A      | Calls phonebook and superheroes via inter-canister calls |
| **superheroes**   | B      | A superhero registry canister                            |

The multicanister canister receives the other canisters' IDs as init args, demonstrating cross-subnet inter-canister communication.

Build all three canisters:

```shell
bun build:examples -- phonebook superheroes multicanister
```

Run the tests:

```shell
bun test:examples -- multicanister
```
