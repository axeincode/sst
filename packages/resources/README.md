# @serverless-stack/resources [![npm](https://img.shields.io/npm/v/@serverless-stack/resources.svg?style=flat-square)](https://www.npmjs.com/package/@serverless-stack/resources)

The `@serverless-stack/resources` package provides a set of additional CDK constructs necessary to build an SST app.

[View the @serverless-stack/resources docs here](https://docs.serverless-stack.com/packages/resources).

## Installation

This package is usually installed together with [`@serverless-stack/cli`](https://www.npmjs.com/package/@serverless-stack/cli).

```bash
# With npm
$ npm install @serverless-stack/cli @serverless-stack/resources --save-exact
# Or with Yarn
$ yarn add @serverless-stack/cli @serverless-stack/resources --exact
```

Note that, the version of these packages should be kept in sync.

## Importing Constructs

You can either import specific constructs in your app.

```js
import { Api } from "@serverless-stack/resources";
```

Or import them all.

```js
import * as sst from "@serverless-stack/resources";
```

## SST Constructs

SST comes with a two types of constructs.

### Low-Level Constructs

These either extend or replace the native CDK constructs.

- [`App`](https://docs.serverless-stack.com/constructs/App)
- [`Stack`](https://docs.serverless-stack.com/constructs/Stack)
- [`Function`](https://docs.serverless-stack.com/constructs/Function)

### Higher-Level Constructs

These are higher level abstractions that wrap around multiple constructs to serve specific use cases.

- [`Api`](https://docs.serverless-stack.com/constructs/Api)
- [`Auth`](https://docs.serverless-stack.com/constructs/Auth)
- [`Cron`](https://docs.serverless-stack.com/constructs/Cron)
- [`Table`](https://docs.serverless-stack.com/constructs/Table)
- [`Topic`](https://docs.serverless-stack.com/constructs/Topic)
- [`Queue`](https://docs.serverless-stack.com/constructs/Queue)
- _And many more!_
