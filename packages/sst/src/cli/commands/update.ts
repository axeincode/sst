import type { Program } from "../program.js";

const PACKAGE_MATCH = [
  "sst",
  "astro-sst",
  "aws-cdk",
  "@aws-cdk",
  "constructs",
  "svelte-kit-sst",
  "solid-start-sst",
];

const FIELDS = ["dependencies", "devDependencies"];

export const update = (program: Program) =>
  program.command(
    "update [version]",
    "Update your SST and CDK packages",
    (yargs) =>
      yargs.positional("version", {
        type: "string",
        describe: "Optionally specify a version to update to",
      }),
    async (args) => {
      const fs = await import("fs/promises");
      const path = await import("path");
      const { fetch } = await import("undici");
      const { useProject } = await import("../../project.js");
      const { Colors } = await import("../colors.js");

      async function find(dir: string): Promise<string[]> {
        const children = await fs.readdir(dir);

        const tasks = children.map(async (item) => {
          if (item === "node_modules") return [];
          // Ignore hidden paths
          if (/(^|\/)\.[^\/\.]/g.test(item)) return [];

          const full = path.join(dir, item);
          if (item === "package.json") return [full];

          const stat = await fs.stat(full);
          if (stat.isDirectory()) return find(full);
          return [];
        });

        return (await Promise.all(tasks)).flat();
      }

      const project = useProject();
      const files = await find(project.paths.root);
      const metadata: any = await fetch(
        `https://registry.npmjs.org/sst/${args.version || "latest"}`
      ).then((resp) => resp.json());

      const results = new Map<string, Set<[string, string]>>();
      const tasks = files.map(async (file) => {
        const data = await fs.readFile(file).then((x) => x.toString());
        // Note: preserve ending new line characters in package.json
        const tailingNewline = data.match(/\r?\n$/)?.[0];
        const json = JSON.parse(data);

        for (const field of FIELDS) {
          const deps = json[field];
          for (const [pkg, existing] of Object.entries(deps || {})) {
            if (!PACKAGE_MATCH.some((x) => pkg.startsWith(x))) continue;
            const desired = (() => {
              // Both sst and astro-sst should be sharing the same version
              if (
                [
                  "sst",
                  "astro-sst",
                  "svelte-kit-sst",
                  "solid-start-sst",
                ].includes(pkg)
              )
                return metadata.version;
              if (pkg === "constructs") return metadata.dependencies.constructs;
              if (pkg.endsWith("alpha"))
                return metadata.dependencies["@aws-cdk/aws-apigatewayv2-alpha"];
              return metadata.dependencies["aws-cdk-lib"];
            })();
            if (existing === desired) continue;
            let arr = results.get(file);
            if (!arr) {
              arr = new Set();
              results.set(file, arr);
            }
            arr.add([pkg, desired]);
            deps[pkg] = desired;
          }
        }

        if (results.has(file)) {
          await fs.writeFile(
            file,
            `${JSON.stringify(json, null, 2)}${tailingNewline ?? ""}`
          );
        }
      });
      await Promise.all(tasks);

      if (results.size === 0) {
        Colors.line(Colors.success(`✔ `), `Already using v${metadata.version}`);
        return;
      }

      for (const [file, pkgs] of results.entries()) {
        Colors.line(
          Colors.success(`✔ `),
          Colors.bold.dim(path.relative(project.paths.root, file))
        );
        for (const [pkg, version] of pkgs) {
          Colors.line(Colors.dim(`   ${pkg}@${version}`));
        }
      }

      Colors.gap();
      Colors.line(
        `${Colors.primary(`➜`)}  ${Colors.warning(
          "Make sure to run: npm install (or pnpm install, or yarn)"
        )}`
      );
      process.exit(0);
    }
  );
