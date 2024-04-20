# Getting started

[PocketIC](https://github.com/dfinity/pocketic) is a deterministic, lightweight and versatile testing solution for [Internet Computer canisters](https://internetcomputer.org/how-it-works/canister-lifecycle/).

PicJS provides bindings to interact with [PocketIC](https://github.com/dfinity/pocketic) from Typescript and JavaScript.

## JavaScript runtime environment

Tests written with PicJS are executed in a JavaScript runtime environment, such as [NodeJS](https://nodejs.org/en).

To get started with PicJS, you will need to have a JavaScript runtime environment installed on your system. If you're new to JavaScript, then [NodeJS](https://nodejs.org/en) is the recommended choice.

[Bun](https://bun.sh/) is an alternative JavaScript runtime environment that is compatible with PicJS. Bun has several features that make it a great choice for running PicJS tests, such as a built-in test runner and assertion library in addition to being much more performant than [NodeJS](https://nodejs.org/en). Bun is not very widely used yet, so it is not recommended for beginners.

[Deno](https://deno.com/) in theory should also work, but it is not officially supported and compatibility is not actively tested. If you choose Deno and run into issues, please open an issue on the [GitHub repository](https://github.com/hadronous/pic-js/issues). Deno is also not widely used, so it is not recommended for developers that are unfamiliar with it.

## Package manager

PicJS is a JavaScript/TypeScript package distributed on [NPM](https://www.npmjs.com/package/@hadronous/pic). To install and manage NPM packages, you will need to have an NPM-compatible package manager.

- [npm](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager)
  - This is the official package manager for [NodeJS](https://nodejs.org/en) and comes pre-installed.
  - Beginners should stick with this option.
- [pnpm](https://pnpm.io/)
  - A fast, disk space-efficient package manager.
  - A great alternative to [npm](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager) for more experienced developers.
- [Yarn](https://yarnpkg.com/)
  - A package manager that doubles down as a project manager.
  - Another great alternative to [npm](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager) for more experienced developers.
- [Bun](https://bun.sh/)
  - Bun also includes a built-in package manager.
  - This is convenient if you are already using Bun as your runtime environment or test runner.

## DFX

DFX is a command-line tool for managing Internet Computer projects. It is used to create, build, and deploy projects to the Internet Computer.

DFX can be installed by running the following command:

```shell
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

You can also check out the official [DFX installation documentation](https://internetcomputer.org/docs/current/developer-docs/getting-started/install) for more information.

DFX version 0.16.0 or later is recommended when writing PicJS tests. If you are on an earlier version then make sure to check out the [Canister declarations guide](./canister-declarations) to see how declarations should be used with older versions with DFX.

## Test runner

PicJS tests can be run with any test runner that runs on [NodeJS](https://nodejs.org/en) or [Bun](https://bun.sh/) (in theory the same should be true for [Deno](https://deno.com/), but that is not actively tested).

The following test runners are actively tested and officially supported:

- [Jest](https://jestjs.io/)
  - Recommended if you're new to JavaScript testing because it has the largest community and is the most widely used.
  - See the [Jest guide](./using-jest) for details on getting started with Jest and PicJS.
- [Vitest](https://vitest.dev/)
  - If you're already using [Vite](https://vitejs.dev/) and Vitest for your frontend, then this is a good choice to reduce your dev dependencies.
  - See the [Vitest guide](./using-vitest) for details on getting started with Vitest and PicJS.
- [Bun](https://bun.sh/)
  - If you're already using Bun, or want to try it out, then this is a good choice.
  - This is not recommended for beginners because it is less widely used and still immature compared to the other options.
  - See the [Bun guide](./using-bun) for details on getting started with Bun and PicJS.
