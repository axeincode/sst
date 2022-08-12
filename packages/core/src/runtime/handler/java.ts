import os from "os";
import path from "path";
import fs from "fs-extra";
import zipLocal from "zip-local";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { State } from "../../state/index.js";
import { Paths } from "../../util/index.js";
import { buildAsync, buildSync, Command, Definition } from "./definition.js";

export const JavaHandler: Definition = (opts: any) => {
  // Check build.gradle exists
  const buildGradle = path.join(opts.srcPath, "build.gradle");
  if (!fs.existsSync(buildGradle)) {
    throw new Error("Cannot find build.gradle at " + buildGradle);
  }

  const dir = State.Function.artifactsPath(
    opts.root,
    path.join(opts.id, opts.srcPath)
  );
  const target = path.join(
    dir,
    path.basename(opts.handler).replace(/::/g, "-"),
  );
  const cmd: Command = {
    command: "gradle",
    args: [
      "build",
      `-Dorg.gradle.project.buildDir=${target}`,
      `-Dorg.gradle.logging.level=${process.env.DEBUG ? "debug" : "lifecycle"}`,
    ],
    env: {},
  };

  // After running `gradle build`, the build directory has the structure:
  //  build/
  //    distributions/
  //      java-lambda-hello-world-0.0.1.tar
  //      java-lambda-hello-world-0.0.1.zip
  //    libs/
  //      java-lambda-hello-world-0.0.1.jar
  //
  // On `sst deploy`, we use "distributions/java-lambda-hello-world-0.0.1.zip" as the Lambda artifact.
  // On `sst start`, we unzip "distributions/java-lambda-hello-world-0.0.1.zip" to "distributions" and
  //   include "distributions/lib/*" in the class path.

  return {
    build: async () => {
      fs.mkdirpSync(dir);
      const issues = await buildAsync(opts, cmd);
      if (issues.length === 0) {
        // Unzip dependencies from .zip
        const zip = fs.readdirSync(`${target}/distributions`).find((f) => f.endsWith(".zip"));
        zipLocal.sync.unzip(`${target}/distributions/${zip}`).save(`${target}/distributions`);
      }
      return issues;
    },
    bundle: () => {
      fs.removeSync(dir);
      fs.mkdirpSync(dir);
      buildSync(opts, cmd);
      // Find the first zip in the build directory
      const zip = fs.readdirSync(`${target}/distributions`).find((f) => f.endsWith(".zip"));
      return {
        handler: opts.handler,
        asset: lambda.Code.fromAsset(`${target}/distributions/${zip}`),
      };
    },
    run: {
      command: "java",
      args: [
        "-cp",
        [
          path.join(
            Paths.OWN_PATH,
            "../src/",
            "runtime",
            "shells",
            "java-bootstrap",
            "release",
            "*"
          ),
          path.join(
            target,
            "libs",
            "*"
          ),
          path.join(
            target,
            "distributions",
            "lib",
            "*"
          ),
        ].join(os.platform() === "win32" ? ";" : ":"),
        "com.amazonaws.services.lambda.runtime.api.client.AWSLambda",
        opts.handler,
      ],
      env: {},
    },
    watcher: {
      include: [
        path.join(opts.srcPath, "**/*.java"),
        path.join(opts.srcPath, "**/*.gradle"),
      ],
      ignore: [],
    },
  };
};
