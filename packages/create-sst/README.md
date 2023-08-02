<p align="center">
  <img alt="create sst" src="https://raw.githubusercontent.com/serverless-stack/identity/main/create-sst/create-sst.svg" width="300" />
</p>

<p align="center">
  <a href="https://sst.dev/discord"><img alt="Discord" src="https://img.shields.io/discord/983865673656705025?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/create-sst"><img alt="npm" src="https://img.shields.io/npm/v/create-sst?style=flat-square" /></a>
</p>

---

A simple CLI [`create-sst`](https://www.npmjs.com/package/create-sst) that sets up a modern web application powered by SST

## Usage

There's no need install this CLI. Just use it directly to create your projects.

With npx.

```bash
npx create-sst@latest
```

Or with npm 6+

```bash
npm init sst
```

Or with Yarn 0.25+

```bash
yarn create sst
```

Or with PNPM 

```bash
pnpm create sst
```

This will prompt you for a folder name and bootstrap the application in that directory.

## Options

Pass in the following (optional) options.

### `--template`

Instead of the standard starter, you can choose to use one of our minimal setups or examples as the template to bootstrap.

```bash
npx create-sst@latest --template=other/go
```

---

## Arguments

### `<destination>`

Specify a project name, instead of typing it into the interactive prompt.


```bash
npx create-sst@latest my-sst-app
```

For more details, [head over to our docs](https://docs.sst.dev).

---

**Join our community** [Discord](https://sst.dev/discord) | [YouTube](https://www.youtube.com/c/sst-dev) | [Twitter](https://twitter.com/SST_dev)
