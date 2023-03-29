import fs from "fs";
import path from "path";
import { Architecture, Function as CdkFunction } from "aws-cdk-lib/aws-lambda";

import { SsrSite } from "./SsrSite.js";
import { Function } from "./Function.js";
import { EdgeFunction } from "./EdgeFunction.js";

/**
 * The `AstroSite` construct is a higher level CDK construct that makes it easy to create a Astro app.
 * @example
 * Deploys a Astro app in the `my-astro-app` directory.
 *
 * ```js
 * new AstroSite(stack, "web", {
 *   path: "my-astro-app/",
 * });
 * ```
 */
export class AstroSite extends SsrSite {
  protected initBuildConfig() {
    return {
      typesPath: "src",
      serverBuildOutputFile: "dist/server/entry.mjs",
      clientBuildOutputDir: "dist/client",
      clientBuildVersionedSubDir: "assets",
    };
  }

  protected validateBuildOutput() {
    const serverDir = path.join(this.props.path, "dist/server");
    const clientDir = path.join(this.props.path, "dist/client");
    if (!fs.existsSync(serverDir) || !fs.existsSync(clientDir)) {
      throw new Error(
        `Build output inside "dist/" does not contain the "server" and "client" folders. Make sure Server-side Rendering (SSR) is enabled in your Astro app. If you are looking to deploy the Astro app as a static site, please use the StaticSite construct — https://docs.sst.dev/constructs/StaticSite`
      );
    }

    super.validateBuildOutput();
  }

  protected createFunctionForRegional(): CdkFunction {
    const {
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
      nodejs,
      bind,
      cdk,
    } = this.props;

    const fn = new Function(this, `ServerFunction`, {
      description: "Server handler",
      handler: path.join(this.props.path, "dist", "server", "entry.handler"),
      logRetention: "three_days",
      runtime,
      memorySize,
      timeout,
      nodejs: {
        format: "esm",
        ...nodejs,
      },
      bind,
      environment,
      permissions,
      ...cdk?.server,
      architecture:
        cdk?.server?.architecture === Architecture.ARM_64 ? "arm_64" : "x86_64",
    });
    fn._doNotAllowOthersToBind = true;

    return fn;
  }

  protected createFunctionForEdge(): EdgeFunction {
    const {
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      nodejs,
    } = this.props;

    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      handler: path.join(this.props.path, "dist", "server", "entry.handler"),
      runtime,
      timeout,
      memorySize,
      bind,
      environment,
      permissions,
      nodejs: {
        format: "esm",
        ...nodejs,
      },
    });
  }
}
