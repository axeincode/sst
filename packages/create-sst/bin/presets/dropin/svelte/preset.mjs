import { patch, extract, install } from "create-sst";

export default [
  extract(),
  install({
    packages: [
      "sst",
      "aws-cdk-lib@2.84.0",
      "constructs@10.1.156",
      "svelte-kit-sst",
    ],
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/scripts/sst:deploy", value: "sst deploy" },
      { op: "add", path: "/scripts/sst:dev", value: "sst dev" },
      { op: "add", path: "/scripts/dev", value: "sst bind vite dev" },
    ],
  }),
];
