# How to use KinesisStream in your serverless app

An example serverless app created with SST.

## Getting Started

[**Read the tutorial**](https://sst.dev/examples/how-to-use-kinesisstream-in-your-serverless-app.html)

Install the example.

```bash
$ npx create-sst@latest --template=examples/kinesisstream
# Or with Yarn
$ yarn create sst --template=examples/kinesisstream
```

## Commands

### `yarn run start`

Starts the local Lambda development environment.

### `yarn run build`

Build your app and synthesize your stacks.

Generates a `.build/` directory with the compiled files and a `.build/cdk.out/` directory with the synthesized CloudFormation stacks.

### `yarn run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy, a specific stack.

### `yarn run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally removes, a specific stack.

### `yarn run test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

## Documentation

Learn more about SST.

- [Docs](https://docs.sst.dev)
- [@serverless-stack/cli](https://docs.sst.dev/packages/cli)
- [@serverless-stack/resources](https://docs.sst.dev/packages/resources)

## Community

[Follow us on Twitter](https://twitter.com/ServerlessStack) or [post on our forums](https://discourse.sst.dev).
