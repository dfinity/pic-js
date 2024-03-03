# NNS Proxy

## NNS State Directory

This example project leverages an NNS state directory to provide the initial state for the NNS subnet. To learn more about how this state directory was created, check out the guide on [working with the NNS](https://hadronous.github.io/pic-js/docs/guides/working-with-the-nns).

The state folder is gitignored, but it is compressed and the archive is committed to the repository.

The state folder is compressed with:

```bash
tar -zcvf examples/nns_proxy/tests/state/nns_state.tar.gz examples/nns_proxy/tests/state/nns_state/
```

The archive is decompressed with:

```bash
tar -xvf examples/nns_proxy/tests/state/nns_state.tar.gz
```

## Bindings

The Rust bindings are generated with:

```bash
didc bind -t rs ./examples/nns_proxy/canisters/governance.did > ./examples/nns_proxy/src/governance.rs
```

Similarly, the TypeScript bindings are generated with:

```bash
didc bind -t ts ./examples/nns_proxy/canisters/governance.did > ./examples/nns_proxy/tests/src/canisters/governance.d.ts
```

And the corresponding JavaScript bindings:

```bash
didc bind -t js ./examples/nns_proxy/canisters/governance.did > ./examples/nns_proxy/tests/src/canisters/governance.js
```

The ICP ledger:

```bash
didc bind -t ts ./examples/nns_proxy/canisters/ledger.did > ./examples/nns_proxy/tests/src/canisters/ledger.d.ts
```

And the corresponding JavaScript bindings:

```bash
didc bind -t js ./examples/nns_proxy/canisters/ledger.did > ./examples/nns_proxy/tests/src/canisters/ledger.js
```
