import { extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["planetscale-node"],
    path: "backend",
  }),
];
