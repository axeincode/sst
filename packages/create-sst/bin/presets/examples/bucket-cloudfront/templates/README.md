# How to set up a CloudFront CDN for S3 files

An example serverless app created with SST.

## Getting Started

Install the example.

```bash
$ npx create-sst@latest --template=examples/bucket-cloudfront
# Or with Yarn
$ yarn create sst --template=examples/bucket-cloudfront
# Or with PNPM
$ pnpm create sst --template=examples/bucket-cloudfront
```

## Commands

### `npm run dev`

Starts the Live Lambda Development environment.

### `npm run build`

Build your app and synthesize your stacks.

### `npm run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy, a specific stack.

### `npm run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally removes, a specific stack.

## Documentation

Learn more about the SST.

- [Docs](https://docs.sst.dev/)
- [sst](https://docs.sst.dev/packages/sst)
