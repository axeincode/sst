# How to add Google authentication to a serverless API

An example serverless app created with SST.

## Getting Started

[**Read the tutorial**](https://sst.dev/examples/how-to-add-facebook-login-to-your-sst-app-with-sst-auth.html)

Install the example.

```bash
$ npx create-sst@latest --template=examples/api-sst-auth-facebook
# Or with Yarn
$ yarn create sst --template=examples/api-sst-auth-facebook
```

## Commands

### `npm run start`

Starts the Live Lambda Development environment.

### `npm run build`

Build your app and synthesize your stacks.

### `npm run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy, a specific stack.

### `npm run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally removes, a specific stack.

### `npm run test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

## Documentation

Learn more about the SST.

- [Docs](https://docs.sst.dev/)
- [@serverless-stack/cli](https://docs.sst.dev/packages/cli)
- [@serverless-stack/resources](https://docs.sst.dev/packages/resources)
