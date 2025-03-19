# Todo Proxy

## Todo State Directory

This example project leverages a todo state directory to provide the initial state for the application subnet. This demonstrates how to use a pre-existing state directory in your tests, similar to how the NNS proxy example works with NNS state.

The state folder is gitignored, but it is compressed and the archive is committed to the repository.

The state folder is compressed with:

```bash
tar -zcvf examples/todo_proxy/tests/state/todo_state.tar.gz examples/todo_proxy/tests/state/todo_state/
```

The archive is decompressed with:

```bash
tar -xvf examples/todo_proxy/tests/state/todo_state.tar.gz
```

## Running Tests

To run the tests:

```bash
bun test:todo_proxy
```

Or to watch for changes:

```bash
bun test:todo_proxy:watch
``` 