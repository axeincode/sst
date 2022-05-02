import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["apollo-server-lambda"],
    path: "backend",
  }),
];
