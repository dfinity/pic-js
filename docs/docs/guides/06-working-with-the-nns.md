# Working with the NNS

If your canister interacts with the NNS, you'll need to setup the NNS state in your tests. If you've already setup a full NNS state locally using the DFX NNS extension then you'll know that this can take a while to complete.

Fortunately, when writing tests with PocketIC you can restore the subnet state from a directory, which is much faster. This guide will walk through the process of creating this state directory for use in your tests.

Note: this guide has been tested with dfx v0.26.0. It is not guaranteed to work with other dfx versions.

## Project setup

To not impact any other projects running on DFX, let's create a new project:

```shell
dfx new --no-frontend --type motoko nns_state
```

Change into the newly created directory:

```shell
cd nns_state
```

Add a local system network to the `dfx.json` file. This will create the appropriate network configuration for the NNS without affecting any other projects that are running on DFX:

```json title="dfx.json"
{
  // redacted...
  "networks": {
    "local": {
      "bind": "127.0.0.1:8080",
      "type": "ephemeral",
      "replica": {
        "subnet_type": "system"
      }
    }
  }
  // redacted...
}
```

Stop DFX if it is already running:

```shell
dfx stop
```

Start DFX with a clean network in the background:

```shell
dfx start --background --clean --artificial-delay 0
```

Install the NNS extension for DFX:

```shell
dfx extension install nns
```

Now, use this extension to setup the NNS. This can take up to a few minutes to complete:

```shell
dfx extension run nns install
```

Once you see

```shell
######################################
# NNS CANISTER INSTALLATION COMPLETE #
######################################
```

run

```shell
dfx stop
```

The subnet state is now stored in the `.dfx/network/local/state/replicated_state` directory. First find a subfolder of that directory containing many canister states:

```shell
ls $(pwd)/.dfx/network/local/state/replicated_state/**/**/canister_states
```

Then save the absolute path to that subfolder into a global variable for use later:

```shell
export NNS_STATE_PATH=$(pwd)/.dfx/network/local/state/replicated_state/46bab453650b3f22d11f0ffe4d3057b855dd752f95eeccc69da5531e94598e2b
```

## Copying the NNS state

Set the root path where you want to copy the NNS state to:

```shell
export TARGET_PATH=/path/to/tests
```

Copy the NNS state into your project:

```shell
mkdir -p $TARGET_PATH && cp -r $NNS_STATE_PATH/ $TARGET_PATH/nns_state/
```

The state directory includes a lot of files, so if you don't want to commit all of them to your repository, you can compress the state directory and commit the archive instead.

First, change to the directory containing the state:

```shell
cd $TARGET_PATH
```

Then compress the state directory:

```shell
tar -Jcvf nns_state.tar.xz nns_state
```

Then when you need to use the state, you can decompress it from the root of your repository with:

```shell
tar -xvf path/to/tests/state/nns_state.tar.xz -C path/to/tests/state
```

This could be done with an `npm` `postinstall` script, by adding the following to your `package.json`:

```json title="package.json"
{
  // redacted...
  "scripts": {
    "postinstall": "tar -xvf path/to/tests/state/nns_state.tar.xz -C path/to/tests/state"
    // redacted...
  }
  // redacted...
}
```

## Using the NNS state in your tests

You'll need to reference the path to the NNS state:

```ts
const NNS_STATE_PATH = resolve(__dirname, '..', 'state', 'nns_state');
```

Now you can setup your PocketIC instance to use the NNS state:

```ts
const pic = await PocketIc.create({
  nns: {
    state: {
      type: SubnetStateType.FromPath,
      path: NNS_STATE_PATH,
    },
  },
});
```

After creating the instance, make sure to set the PocketIc time to be the same or greater than the time that you created the NNS state:

```ts
await pic.setTime(new Date(2025, 4, 29).getTime());
await pic.tick();
```

Check out the [`NNS Proxy`](https://github.com/dfinity/pic-js/tree/main/examples/nns_proxy) example for a full example of how to use the NNS state in your tests.
