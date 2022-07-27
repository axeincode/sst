import { extend, extract, install } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["node-fetch"],
    path: "services",
  }),
];
