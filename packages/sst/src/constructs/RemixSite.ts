import fs from "fs";
import url from "url";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { SsrSite } from "./SsrSite.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";
import { VisibleError } from "../error.js";
import { useWarning } from "./util/warning.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

type RemixConfig = {
  assetsBuildDirectory: string;
  publicPath: string;
  serverBuildPath: string;
  serverPlatform: string;
  server?: string;
};

/**
 * The `RemixSite` construct is a higher level CDK construct that makes it easy to create a Remix app.
 *
 * @example
 *
 * Deploys a Remix app in the `my-remix-app` directory.
 *
 * ```js
 * new RemixSite(stack, "web", {
 *   path: "my-remix-app/",
 * });
 * ```
 */
export class RemixSite extends SsrSite {
  private serverModuleFormat: "cjs" | "esm" = "cjs";

  protected initBuildConfig() {
    const { path: sitePath } = this.props;

    const configDefaults: RemixConfig = {
      assetsBuildDirectory: "public/build",
      publicPath: "/build/",
      serverBuildPath: "build/index.js",
      serverPlatform: "node",
    };

    // Validate config path
    const configPath = path.resolve(sitePath, "remix.config.js");
    if (!fs.existsSync(configPath)) {
      throw new VisibleError(
        `In the "${this.node.id}" Site, could not find "remix.config.js" at expected path "${configPath}".`
      );
    }

    // Load config
    const userConfig = require(configPath);
    this.serverModuleFormat = userConfig.serverModuleFormat ?? "cjs";
    if (userConfig.serverModuleFormat !== "esm") {
      useWarning().add("remix.cjs");
    }

    // Validate config
    const config: RemixConfig = {
      ...configDefaults,
      ...userConfig,
    };
    Object.keys(configDefaults).forEach((key) => {
      const k = key as keyof RemixConfig;
      if (config[k] !== configDefaults[k]) {
        throw new VisibleError(
          `In the "${this.node.id}" Site, remix.config.js "${key}" must be "${configDefaults[k]}".`
        );
      }
    });

    return {
      typesPath: ".",
      serverBuildOutputFile: "build/index.js",
      clientBuildOutputDir: "public",
      clientBuildVersionedSubDir: "build",
      // Note: When using libraries like remix-flat-routes the file can
      // contains special characters like "+". It needs to be encoded.
      clientCFFunctionInjection: `
       request.uri = request.uri.split('/').map(encodeURIComponent).join('/');
      `,
    };
  }

  private createServerLambdaBundle(wrapperFile: string) {
    // Create a Lambda@Edge handler for the Remix server bundle.
    //
    // Note: Remix does perform their own internal ESBuild process, but it
    // doesn't bundle 3rd party dependencies by default. In the interest of
    // keeping deployments seamless for users we will create a server bundle
    // with all dependencies included. We will still need to consider how to
    // address any need for external dependencies, although I think we should
    // possibly consider this at a later date.

    // In this path we are assuming that the Remix build only outputs the
    // "core server build". We can safely assume this as we have guarded the
    // remix.config.js to ensure it matches our expectations for the build
    // configuration.
    // We need to ensure that the "core server build" is wrapped with an
    // appropriate Lambda@Edge handler. We will utilise an internal asset
    // template to create this wrapper within the "core server build" output
    // directory.

    // Ensure build directory exists
    const buildPath = path.join(this.props.path, "build");
    fs.mkdirSync(buildPath, { recursive: true });

    // Copy the server lambda handler
    fs.copyFileSync(
      path.resolve(__dirname, `../support/remix-site-function/${wrapperFile}`),
      path.join(buildPath, "server.js")
    );

    // Copy the Remix polyfil to the server build directory
    //
    // Note: We need to ensure that the polyfills are injected above other code that
    // will depend on them. Importing them within the top of the lambda code
    // doesn't appear to guarantee this, we therefore leverage ESBUild's
    // `inject` option to ensure that the polyfills are injected at the top of
    // the bundle.
    const polyfillDest = path.join(buildPath, "polyfill.js");
    fs.copyFileSync(
      path.resolve(__dirname, "../support/remix-site-function/polyfill.js"),
      polyfillDest
    );

    return {
      handler: path.join(buildPath, "server.handler"),
      esbuild: { inject: [polyfillDest] },
    };
  }

  protected createFunctionForRegional() {
    const {
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
      bind,
      nodejs,
      cdk,
    } = this.props;

    const { handler, esbuild } =
      this.createServerLambdaBundle("regional-server.js");

    return new SsrFunction(this, `ServerFunction`, {
      description: "Server handler for Remix",
      handler,
      runtime,
      memorySize,
      timeout,
      nodejs: {
        format: this.serverModuleFormat,
        ...nodejs,
        esbuild: {
          ...esbuild,
          ...nodejs?.esbuild,
          inject: [...(nodejs?.esbuild?.inject || []), ...esbuild.inject],
        },
      },
      bind,
      environment,
      permissions,
      ...cdk?.server,
    });
  }

  protected createFunctionForEdge() {
    const {
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      nodejs,
    } = this.props;

    const { handler, esbuild } =
      this.createServerLambdaBundle("edge-server.js");

    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      handler,
      runtime,
      timeout,
      memorySize,
      bind,
      environment,
      permissions,
      nodejs: {
        format: this.serverModuleFormat,
        ...nodejs,
        esbuild: {
          ...esbuild,
          ...nodejs?.esbuild,
          inject: [...(nodejs?.esbuild?.inject || []), ...esbuild.inject],
        },
      },
    });
  }

  public getConstructMetadata() {
    return {
      type: "RemixSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
