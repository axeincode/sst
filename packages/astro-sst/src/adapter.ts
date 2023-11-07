import type { AstroAdapter, AstroIntegration } from "astro";
import type {
  EntrypointParameters,
  ResponseMode,
  DeploymentStrategy,
} from "./lib/types.js";
import { BuildMeta, IntegrationConfig } from "./lib/build-meta.js";

const PACKAGE_NAME = "astro-sst";

function getAdapter({
  deploymentStrategy,
  responseMode,
}: {
  deploymentStrategy: DeploymentStrategy;
  responseMode: ResponseMode;
}): AstroAdapter {
  const isStatic = deploymentStrategy === "static";
  const isRegional = deploymentStrategy === "regional";

  const baseConfig: AstroAdapter = {
    name: PACKAGE_NAME,
    serverEntrypoint: `${PACKAGE_NAME}/entrypoint`,
    args: { responseMode },
    exports: ["handler"],
    adapterFeatures: {
      edgeMiddleware: false,
      functionPerRoute: false,
    },
    supportedAstroFeatures: {
      staticOutput: "stable",
      hybridOutput: "stable",
      serverOutput: "stable",
      assets: {
        supportKind: "stable",
        isSharpCompatible: isRegional,
        isSquooshCompatible: isRegional,
      },
    },
  };

  return !isStatic
    ? baseConfig
    : {
        name: baseConfig.name,
        supportedAstroFeatures: {
          ...baseConfig.supportedAstroFeatures,
          assets: {
            supportKind: "unsupported",
          },
        },
      };
}

export default function createIntegration(
  entrypointParameters: EntrypointParameters = {}
): AstroIntegration {
  const integrationConfig: IntegrationConfig = {
    deploymentStrategy: entrypointParameters.deploymentStrategy ?? "regional",
    responseMode: entrypointParameters.responseMode ?? "buffer",
    serverRoutes: entrypointParameters.serverRoutes ?? [],
  };

  if (
    integrationConfig.deploymentStrategy !== "regional" &&
    integrationConfig.responseMode === "stream"
  ) {
    throw new Error(
      `Deployment strategy ${integrationConfig.deploymentStrategy} does not support streaming responses. Use 'buffer' response mode.`
    );
  }

  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        if (
          integrationConfig.deploymentStrategy !== "static" &&
          config.output === "static"
        ) {
          // If the user has not specified an output, we will allow the Astro config to override default deployment strategy.
          if (typeof entrypointParameters.deploymentStrategy === "undefined") {
            integrationConfig.deploymentStrategy = "static";
          } else {
            console.log(
              `[astro-sst] Overriding output to 'server' to support ${integrationConfig.deploymentStrategy} deployment.`
            );
            updateConfig({
              output: "server",
            });
          }
        }

        if (
          integrationConfig.deploymentStrategy === "static" &&
          config.output !== "static"
        ) {
          console.log(
            `[astro-sst] Overriding output to 'static' to support ${integrationConfig.deploymentStrategy} deployment.`
          );
          updateConfig({
            output: "static",
          });
        }

        // Enable sourcemaps
        updateConfig({
          vite: {
            build: {
              sourcemap: true,
            },
          },
        });

        BuildMeta.setIntegrationConfig(integrationConfig);
      },
      "astro:config:done": ({ config, setAdapter }) => {
        BuildMeta.setAstroConfig(config);
        setAdapter(
          getAdapter({
            deploymentStrategy: integrationConfig.deploymentStrategy,
            responseMode: integrationConfig.responseMode,
          })
        );
      },
      "astro:build:done": async (buildResults) => {
        BuildMeta.setBuildResults(buildResults);
        await BuildMeta.exportBuildMeta();
      },
    },
  };
}
