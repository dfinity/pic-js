# Running tests

## Configuring logging

### Canister logs

Logs for canisters can be configured when running the PocketIC server using the `showCanisterLogs` option, for example:

```ts
const pic = await PocketIcServer.start({
  showCanisterLogs: true,
});
```

### Server logs

Logs for the PocketIC server can be configured by setting the `POCKET_IC_LOG_DIR` and `POCKET_IC_LOG_DIR_LEVELS` environment variables.

The `POCKET_IC_LOG_DIR` variable specifies the directory where the logs will be stored. It accepts any valid relative, or absolute directory path.

The `POCKET_IC_LOG_DIR_LEVELS` variable specifies the log levels. It accepts any of the following `string` values: `trace`, `debug`, `info`, `warn`, or `error`.

For example:

```shell
POCKET_IC_LOG_DIR=./logs POCKET_IC_LOG_DIR_LEVELS=trace npm test
```

### Runtime logs

Logs for the IC runtime can be configured when running the PocketIC server using the `showRuntimeLogs` option, for example:

```ts
const pic = await PocketIcServer.start({
  showRuntimeLogs: true,
});
```
