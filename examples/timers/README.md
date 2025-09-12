# Timers

This example demonstrates a minimal Motoko canister that sets a one-shot timer.
It exposes a single public function `timers` which schedules a timer to increment
an internal counter after 1 second and returns the current counter value.

Build the canister:

```shell
bun build:timers
```

Run the tests:

```shell
bun test:timers
```
