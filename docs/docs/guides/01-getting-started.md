# Getting started

## JavaScript runtime environment

Tests written with PicJS are executed in a JavaScript runtime environment, such as [NodeJS](https://nodejs.org/en). To get started with PicJS, you will need to have a JavaScript runtime environment installed on your system.

[Bun](https://bun.sh/) is an alternative JavaScript runtime environment that is compatible with PicJS. Bun has several features that make it a great choice for running PicJS tests, such as a built-in test runner and assertion library in addition to being much more performant than NodeJS.

[Deno](https://deno.com/) in theory should also work, but it is not officially supported and compatibility is not actively tested. If you choose Deno and run into issues, please open an issue on the [GitHub repository](https://github.com/hadronous/pic-js/issues).

## Package manager

PicJS is a JavaScript/TypeScript package distributed on [NPM](https://www.npmjs.com/package/@hadronous/pic). To install and manage NPM packages, you will need to have an NPM-compatible package manager.

- [npm](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager) is the official package manager for NodeJS and comes pre-installed with NodeJS.
- [pnpm](https://pnpm.io/) is a fast, disk space-efficient package manager.
- [Yarn](https://yarnpkg.com/) is a package manager that doubles down as a project manager.
- [Bun](https://bun.sh/) also includes a built-in package manager.

## DFX

DFX is a command-line tool for managing Internet Computer projects. It is used to create, build, and deploy projects to the Internet Computer.

DFX can be installed by running the following command:

```shell
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

You can also check out the official [DFX installation documentation](https://internetcomputer.org/docs/current/developer-docs/getting-started/install) for more information.

DFX version 0.16.0 or later is recommended when writing PicJS tests. If you are on an earlier version then make sure to check out the [Canister declarations guide](./canister-declarations) to see how declarations should be used with older versions with DFX.
