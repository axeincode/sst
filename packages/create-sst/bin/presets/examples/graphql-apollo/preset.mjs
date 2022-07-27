import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["apollo-server-lambda"],
    path: "services",
  }),
];
