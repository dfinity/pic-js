# Working with the NNS

If your canister interacts with the NNS, you'll need to setup the NNS state in your tests. If you've already setup a full NNS state locally using the DFX NNS extension then you'll know that this can take a while to complete.

Fortunately, when writing tests with PocketIC you can restore the subnet state from a directory, which is much faster. This guide will walk through the process of creating this state directory for use in your tests.

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

The subnet state is now stored in the `.dfx/network/local/state/replicated_state` directory. Save the absolute path to this directory into a global variable for use later:

```shell
export NNS_STATE_PATH=$(pwd)/.dfx/network/local/state/replicated_state
```

Wait a few seconds to make sure there are no more logs from DFX coming in, and there is at least checkpoint in the `.dfx/network/local/state/replicated_state/node-100/state/checkpoints` folder, then stop DFX:

```shell
dfx stop
```

## Getting the subnet Id

### Install Rust

Install Rust according to the instructions on [the official website](https://www.rust-lang.org/tools/install).

### Install `protoc`

On macOS, you can use Homebrew:

```shell
brew install protobuf
```

On Ubuntu, you can use `apt`:

```shell
sudo apt install protobuf-compiler
```

### Install `jq`

On macOS, you can use Homebrew:

```shell
brew install jq
```

On Ubuntu, you can use `apt`:

```shell
sudo apt install jq
```

### Using `ic-regedit`

Now clone the `ic` repository:

```shell
git clone git@github.com:dfinity/ic.git
```

Change into the `ic` directory:

```shell
cd ic
```

Get the subnet Id from your NNS state:

```shell
cargo run -p ic-regedit snapshot $NNS_STATE_PATH/ic_registry_local_store | jq -r ".nns_subnet_id.principal_id.raw"
```

This should output something similar to the following:

```shell
(principal-id)jnebg-dq662-hfu2t-2momi-md5lw-7qmvl-htn5r-52soa-6xbqp-6p5sd-aae
```

Save everything after the `(principal-id)` part for use later in your tests.

## Copying the NNS state

Set the root path where you want to copy the NNS state to:

```shell
export TARGET_PATH=/path/to/tests
```

Copy the NNS state into your project:

```shell
mkdir -p $TARGET_PATH && cp -r $NNS_STATE_PATH $TARGET_PATH/nns_state/
```

The state directory includes a lot of files, so if you don't want to commit all of them to your repository, you can compress the state directory and commit the archive instead.

First, change to the directory containing the state:

```shell
cd $TARGET_PATH
```

Then compress the state directory:

```shell
tar -zcvf nns_state.tar.gz nns_state
```

Then when you need to use the state, you can decompress it from the root of your repository with:

```shell
tar -xvf path/to/tests/state/nns_state.tar.gz -C path/to/tests/state
```

This could be done with an `npm` `postinstall` script, by adding the following to your `package.json`:

```json title="package.json"
{
  // redacted...
  "scripts": {
    "postinstall": "tar -xvf path/to/tests/state/nns_state.tar.gz -C path/to/tests/state"
    // redacted...
  }
  // redacted...
}
```

## Using the NNS state in your tests

You'll need the subnet Id that you recored earlier:

```ts
const NNS_SUBNET_ID =
  'nt6ha-vabpm-j6nog-bkr62-vbgbt-swwzc-u54zn-odtoy-igwlu-ab7uj-4qe';
```

And you'll need to reference the path to the NNS state:

```ts
const NNS_STATE_PATH = resolve(
  __dirname,
  '..',
  'state',
  'nns_state',
  'node-100',
  'state',
);
```

Now you can setup your PocketIC instance to use the NNS state:

```ts
const pic = await PocketIc.create({
  nns: {
    state: {
      type: SubnetStateType.FromPath,
      path: NNS_STATE_PATH,
      subnetId: Principal.fromText(NNS_SUBNET_ID),
    },
  },
});
```

After creating the instance, make sure to set the PocketIc time to be the same or greater than the time that you created the NNS state:

```ts
await pic.setTime(new Date(2024, 1, 30).getTime());
await pic.tick();
```

Check out the [`NNS Proxy`](https://github.com/hadronous/pic-js/tree/main/examples/nns_proxy) example for a full example of how to use the NNS state in your tests.
