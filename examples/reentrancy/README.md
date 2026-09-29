# Reentrancy

This example demonstrates how to reproduce a reentrancy bug by interleaving calls with a deferred actor.

The canister is a bank with two withdrawal methods that await a transfer:

- `withdraw_vulnerable` checks the balance before the `await` and deducts it after. Two withdrawals submitted together both pass the check, so the balance is paid out twice.
- `withdraw_fixed` deducts the balance before the `await` and refunds it if the transfer fails, so only one of the two withdrawals succeeds.

The tests submit both withdrawals with a deferred actor before executing either of them. They also show that a regular actor, which executes each call before the next one is made, doesn't reproduce the bug.

Build the canister:

```shell
pnpm build:examples -- reentrancy
```

Run the tests:

```shell
pnpm test:examples -- reentrancy
```
