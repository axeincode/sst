import path from "path";
import url from "url";
import fs from "fs";
import { VisibleError } from "../error.js";
import { execAsync } from "../util/process.js";
import { existsAsync } from "../util/fs.js";
import { Colors } from "../cli/colors.js";

import { Construct } from "constructs";
import { Duration as CdkDuration, IgnoreMode } from "aws-cdk-lib/core";
import {
  Role,
  Effect,
  PolicyStatement,
  AccountPrincipal,
  ServicePrincipal,
  CompositePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  ViewerProtocolPolicy,
  AllowedMethods,
  CachedMethods,
  CachePolicy,
  CacheQueryStringBehavior,
  CacheHeaderBehavior,
  CacheCookieBehavior,
  DistributionProps,
  OriginProtocolPolicy,
  OriginRequestPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Distribution, DistributionDomainProps } from "./Distribution.js";
import { SSTConstruct } from "./Construct.js";
import { Function } from "./Function.js";
import { Secret } from "./Secret.js";
import { useDeferredTasks } from "./deferred_task.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import {
  FunctionBindingProps,
  bindEnvironment,
  bindPermissions,
  getParameterPath,
  getReferencedSecrets,
} from "./util/functionBinding.js";
import { useProject } from "../project.js";
import {
  ISecurityGroup,
  IVpc,
  SubnetSelection,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  AwsLogDriver,
  CfnTaskDefinition,
  Cluster,
  ContainerImage,
  ContainerDefinition,
  ContainerDefinitionOptions,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  FargateServiceProps,
} from "aws-cdk-lib/aws-ecs";
import { LogGroup, LogRetention, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import {
  ApplicationLoadBalancer,
  ApplicationLoadBalancerProps,
  ApplicationTargetGroup,
  ApplicationTargetGroupProps,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { createAppContext } from "./context.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const NIXPACKS_IMAGE_NAME = "sst-nixpacks";

const supportedCpus = {
  "0.25 vCPU": 256,
  "0.5 vCPU": 512,
  "1 vCPU": 1024,
  "2 vCPU": 2048,
  "4 vCPU": 4096,
  "8 vCPU": 8192,
  "16 vCPU": 16384,
};

const supportedMemories = {
  "0.25 vCPU": {
    "0.5 GB": 512,
    "1 GB": 1024,
    "2 GB": 2048,
  },
  "0.5 vCPU": {
    "1 GB": 1024,
    "2 GB": 2048,
    "3 GB": 3072,
    "4 GB": 4096,
  },
  "1 vCPU": {
    "2 GB": 2048,
    "3 GB": 3072,
    "4 GB": 4096,
    "5 GB": 5120,
    "6 GB": 6144,
    "7 GB": 7168,
    "8 GB": 8192,
  },
  "2 vCPU": {
    "4 GB": 4096,
    "5 GB": 5120,
    "6 GB": 6144,
    "7 GB": 7168,
    "8 GB": 8192,
    "9 GB": 9216,
    "10 GB": 10240,
    "11 GB": 11264,
    "12 GB": 12288,
    "13 GB": 13312,
    "14 GB": 14336,
    "15 GB": 15360,
    "16 GB": 16384,
  },
  "4 vCPU": {
    "8 GB": 8192,
    "9 GB": 9216,
    "10 GB": 10240,
    "11 GB": 11264,
    "12 GB": 12288,
    "13 GB": 13312,
    "14 GB": 14336,
    "15 GB": 15360,
    "16 GB": 16384,
    "17 GB": 17408,
    "18 GB": 18432,
    "19 GB": 19456,
    "20 GB": 20480,
    "21 GB": 21504,
    "22 GB": 22528,
    "23 GB": 23552,
    "24 GB": 24576,
    "25 GB": 25600,
    "26 GB": 26624,
    "27 GB": 27648,
    "28 GB": 28672,
    "29 GB": 29696,
    "30 GB": 30720,
  },
  "8 vCPU": {
    "16 GB": 16384,
    "20 GB": 20480,
    "24 GB": 24576,
    "28 GB": 28672,
    "32 GB": 32768,
    "36 GB": 36864,
    "40 GB": 40960,
    "44 GB": 45056,
    "48 GB": 49152,
    "52 GB": 53248,
    "56 GB": 57344,
    "60 GB": 61440,
  },
  "16 vCPU": {
    "32 GB": 32768,
    "40 GB": 40960,
    "48 GB": 49152,
    "56 GB": 57344,
    "64 GB": 65536,
    "72 GB": 73728,
    "80 GB": 81920,
    "88 GB": 90112,
    "96 GB": 98304,
    "104 GB": 106496,
    "112 GB": 114688,
    "120 GB": 122880,
  },
};

export interface ServiceDomainProps extends DistributionDomainProps {}
export interface ServiceCdkDistributionProps
  extends Omit<DistributionProps, "defaultBehavior"> {}

export interface ServiceProps {
  /**
   * Path to the directory where the app is located.
   * @default "."
   */
  path?: string;
  /**
   * Path to Dockerfile relative to the defined "path".
   * @default "Dockerfile"
   */
  file?: string;
  /**
   * The CPU architecture of the container.
   * @default "x86_64"
   * @example
   * ```js
   * {
   *   architecture: "arm64",
   * }
   * ```
   */
  architecture?: Lowercase<
    keyof Pick<typeof CpuArchitecture, "ARM64" | "X86_64">
  >;
  /**
   * The amount of CPU allocated.
   * @default "0.25 vCPU"
   * @example
   * ```js
   * {
   *   cpu: "1 vCPU",
   * }
   *```
   */
  cpu?: keyof typeof supportedCpus;
  /**
   * The amount of memory allocated.
   * @default "0.5 GB"
   * @example
   * ```js
   * {
   *   memory: "2 GB",
   * }
   *```
   */
  memory?: `${number} GB`;
  /**
   * The port number on the container.
   * @default 3000
   * @example
   * ```js
   * {
   *   port: 8000,
   * }
   *```
   */
  port?: number;
  scaling?: {
    /**
     * The minimum capacity for the cluster.
     * @default 1
     * @example
     * ```js
     * {
     *   scaling: {
     *    minContainers: 4,
     *    maxContainers: 16,
     *   },
     * }
     *```
     */
    minContainers?: number;
    /**
     * The maximum capacity for the cluster.
     * @default 1
     * @example
     * ```js
     * {
     *   scaling: {
     *    minContainers: 4,
     *    maxContainers: 16,
     *   },
     * }
     *```
     */
    maxContainers?: number;
    /**
     * Scales in or out to achieve a target cpu utilization.
     * @default 70
     * @example
     * ```js
     * {
     *   scaling: {
     *    cpuUtilization: 50,
     *    memoryUtilization: 50,
     *   },
     * }
     *```
     */
    cpuUtilization?: number;
    /**
     * Scales in or out to achieve a target memory utilization.
     * @default 70
     * @example
     * ```js
     * {
     *   scaling: {
     *    cpuUtilization: 50,
     *    memoryUtilization: 50,
     *   },
     * }
     *```
     */
    memoryUtilization?: number;
    /**
     * Scales in or out to achieve a target request count per container.
     * @default 500
     * @example
     * ```js
     * {
     *   scaling: {
     *    requestsPerContainer: 1000,
     *   },
     * }
     *```
     */
    requestsPerContainer?: number;
  };
  /**
   * Bind resources for the function
   *
   * @example
   * ```js
   * {
   *   bind: [STRIPE_KEY, bucket],
   * }
   * ```
   */
  bind?: SSTConstruct[];
  /**
   * The customDomain for this service. SST supports domains that are hosted
   * either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js
   * {
   *   customDomain: "domain.com",
   * }
   * ```
   *
   * ```js
   * {
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *     hostedZone: "domain.com"
   *   }
   * }
   * ```
   */
  customDomain?: string | ServiceDomainProps;
  /**
   * Attaches the given list of permissions to the SSR function. Configuring this property is equivalent to calling `attachPermissions()` after the site is created.
   * @example
   * ```js
   * {
   *   permissions: ["ses"]
   * }
   * ```
   */
  permissions?: Permissions;
  /**
   * An object with the key being the environment variable name.
   *
   * @example
   * ```js
   * {
   *   environment: {
   *     API_URL: api.url,
   *     USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   },
   * }
   * ```
   */
  environment?: Record<string, string>;
  /**
   * The duration logs are kept in CloudWatch Logs.
   * @default Logs retained indefinitely
   * @example
   * ```js
   * {
   *   logRetention: "one_week"
   * }
   * ```
   */
  logRetention?: Lowercase<keyof typeof RetentionDays>;
  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   * @default false
   * @example
   * ```js
   * {
   *   waitForInvalidation: true
   * }
   * ```
   */
  waitForInvalidation?: boolean;
  build?: {
    /**
     * Build args to pass to the docker build command.
     * @default No build args
     * @example
     * ```js
     * {
     *   build: {
     *     buildArgs: {
     *       FOO: "bar"
     *     }
     *   }
     * }
     * ```
     */
    buildArgs?: Record<string, string>;
  };
  dev?: {
    /**
     * When running `sst dev, site is not deployed. This is to ensure `sst dev` can start up quickly.
     * @default false
     * @example
     * ```js
     * {
     *   dev: {
     *     deploy: true
     *   }
     * }
     * ```
     */
    deploy?: boolean;
    /**
     * The local site URL when running `sst dev`.
     * @example
     * ```js
     * {
     *   dev: {
     *     url: "http://localhost:3000"
     *   }
     * }
     * ```
     */
    url?: string;
  };
  cdk?: {
    /**
     * By default, SST creates a CloudFront distribution. Pass in a value to override the default settings this construct uses to create the CDK `Distribution` internally. Alternatively, set this to `false` to skip creating the distribution.
     * @default true
     * @example
     * ```js
     * {
     *   cdk: {
     *     cloudfrontDistribution: false
     *   }
     * }
     * ```
     */
    cloudfrontDistribution?: boolean | ServiceCdkDistributionProps;
    /**
     * By default, SST creates an Application Load Balancer to distribute requests across containers. Set this to `false` to skip creating the load balancer.
     * @default true
     * @example
     * ```js
     * {
     *   cdk: {
     *     applicationLoadBalancer: false
     *   }
     * }
     * ```
     */
    applicationLoadBalancer?:
      | boolean
      | Omit<ApplicationLoadBalancerProps, "vpc">;
    /**
     * Customize the Application Load Balancer's target group.
     * @default true
     * @example
     * ```js
     * {
     *   cdk: {
     *     applicationLoadBalancerTargetGroup: {
     *       healthCheck: {
     *         path: "/health"
     *       }
     *     }
     *   }
     * }
     * ```
     */
    applicationLoadBalancerTargetGroup?: ApplicationTargetGroupProps;
    /**
     * Customize the Fargate Service.
     * @example
     * ```js
     * {
     *   cdk: {
     *     fargateService: {
     *       circuitBreaker: { rollback: true }
     *     }
     *   }
     * }
     * ```
     */
    fargateService?: Omit<FargateServiceProps, "cluster" | "taskDefinition">;
    /**
     * Customizing the container definition for the ECS task.
     * @example
     * ```js
     * {
     *   cdk: {
     *     container: {
     *       healthCheck: {
     *         command: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
     *       }
     *     }
     *   }
     * }
     * ```
     */
    container?: Omit<ContainerDefinitionOptions, "image"> & {
      image?: ContainerDefinitionOptions["image"];
    };
    /**
     * Runs codebuild job in the specified VPC. Note this will only work once deployed.
     *
     * @example
     * ```js
     * import { Vpc } from "aws-cdk-lib/aws-ec2";
     *
     * {
     *   cdk: {
     *     vpc: Vpc.fromLookup(stack, "VPC", {
     *       vpcId: "vpc-xxxxxxxxxx",
     *     }),
     *   }
     * }
     * ```
     */
    vpc?: IVpc;
  };
}

type ServiceNormalizedProps = ServiceProps & {
  architecture: Exclude<ServiceProps["architecture"], undefined>;
  cpu: Exclude<ServiceProps["cpu"], undefined>;
  path: Exclude<ServiceProps["path"], undefined>;
  memory: Exclude<ServiceProps["memory"], undefined>;
  port: Exclude<ServiceProps["port"], undefined>;
  logRetention: Exclude<ServiceProps["logRetention"], undefined>;
};

/**
 * The `Service` construct is a higher level CDK construct that makes it easy to create modern web apps with Server Side Rendering capabilities.
 * @example
 * Deploys a service in the `app` directory.
 *
 * ```js
 * new Service(stack, "myApp", {
 *   path: "app",
 * });
 * ```
 */
export class Service extends Construct implements SSTConstruct {
  public readonly id: string;
  private props: ServiceNormalizedProps;
  private doNotDeploy: boolean;
  private devFunction?: Function;
  private vpc?: IVpc;
  private cluster?: Cluster;
  private container?: ContainerDefinition;
  private taskDefinition?: FargateTaskDefinition;
  private service?: FargateService;
  private distribution?: Distribution;
  private alb?: ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props?: ServiceProps) {
    super(scope, id);

    const app = scope.node.root as App;
    const stack = Stack.of(this) as Stack;
    this.id = id;
    this.props = {
      path: ".",
      architecture: props?.architecture || "x86_64",
      cpu: props?.cpu || "0.25 vCPU",
      memory: props?.memory || "0.5 GB",
      port: props?.port || 3000,
      logRetention: props?.logRetention || "infinite",
      ...props,
    };
    this.doNotDeploy =
      !stack.isActive || (app.mode === "dev" && !this.props.dev?.deploy);

    this.validateServiceExists();
    this.validateMemoryAndCpu();

    useServices().add(stack.stackName, id, this.props);

    if (this.doNotDeploy) {
      this.devFunction = this.createDevFunction();
      app.registerTypes(this);
      return;
    }

    // Create ECS cluster
    const vpc = this.createVpc();
    const { cluster, container, taskDefinition, service } =
      this.createService(vpc);
    const { alb, target } = this.createLoadBalancer(vpc, service);
    this.createAutoScaling(service, target);
    this.alb = alb;

    // Create Distribution
    this.distribution = this.createDistribution(alb);

    this.vpc = vpc;
    this.cluster = cluster;
    this.service = service;
    this.container = container;
    this.taskDefinition = taskDefinition;
    this.bindForService(props?.bind || []);
    this.attachPermissionsForService(props?.permissions || []);
    Object.entries(props?.environment || {}).map(([key, value]) =>
      this.addEnvironmentForService(key, value)
    );

    useDeferredTasks().add(async () => {
      if (!app.isRunningSSTTest() && !props?.cdk?.container?.image) {
        Colors.line(
          `➜  Building the container image for the "${this.node.id}" service...`
        );

        // Build app
        let dockerfile: string;
        // case: custom Dockerfile provided
        if (this.props.file) {
          dockerfile = this.props.file;
        }
        // case: default Dockerfile found
        else if (await existsAsync(path.join(this.props.path, "Dockerfile"))) {
          dockerfile = "Dockerfile";
        }
        // case: nixpack
        else {
          await this.createNixpacksBuilder();
          dockerfile = await this.runNixpacksBuild();
        }
        await this.runDockerBuild(dockerfile);
        this.updateContainerImage(dockerfile, taskDefinition, container);
      }

      // Invalidate CloudFront
      this.distribution?.createInvalidation({
        wait: this.props.waitForInvalidation,
      });
    });

    app.registerTypes(this);
  }

  /////////////////////
  // Public Properties
  /////////////////////

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    if (this.doNotDeploy) return this.props.dev?.url;

    return this.distribution?.url;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get customDomainUrl() {
    if (this.doNotDeploy) return;

    return this.distribution?.customDomainUrl;
  }

  /**
   * The internally created CDK resources.
   */
  public get cdk() {
    if (this.doNotDeploy) return;

    return {
      vpc: this.vpc,
      cluster: this.cluster,
      fargateService: this.service,
      taskDefinition: this.taskDefinition,
      distribution: this.distribution?.cdk.distribution,
      applicationLoadBalancer: this.alb,
      hostedZone: this.distribution?.cdk.hostedZone,
      certificate: this.distribution?.cdk.certificate,
    };
  }

  /////////////////////
  // Public Methods
  /////////////////////

  public getConstructMetadata() {
    return {
      type: "Service" as const,
      data: {
        mode: this.doNotDeploy
          ? ("placeholder" as const)
          : ("deployed" as const),
        path: this.props.path,
        customDomainUrl: this.customDomainUrl,
        url: this.url,
        devFunction: this.devFunction?.functionArn,
        task: this.taskDefinition?.taskDefinitionArn,
        container: this.container?.containerName,
        secrets: (this.props.bind || [])
          .filter((c) => c instanceof Secret)
          .map((c) => (c as Secret).name),
      },
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    const app = this.node.root as App;
    return this.distribution
      ? {
          clientPackage: "service",
          variables: {
            url: this.doNotDeploy
              ? {
                  type: "plain",
                  value: this.props.dev?.url ?? "localhost",
                }
              : {
                  // Do not set real value b/c we don't want to make the Lambda function
                  // depend on the Site. B/c often the site depends on the Api, causing
                  // a CloudFormation circular dependency if the Api and the Site belong
                  // to different stacks.
                  type: "site_url",
                  value: this.customDomainUrl || this.url!,
                },
          },
          permissions: {
            "ssm:GetParameters": [
              `arn:${Stack.of(this).partition}:ssm:${app.region}:${
                app.account
              }:parameter${getParameterPath(this, "url")}`,
            ],
          },
        }
      : {
          clientPackage: "service",
          variables: {},
          permissions: {},
        };
  }

  /**
   * Binds additional resources to service.
   *
   * @example
   * ```js
   * service.bind([STRIPE_KEY, bucket]);
   * ```
   */
  public bind(constructs: SSTConstruct[]): void {
    this.devFunction?.bind(constructs);
    this.bindForService(constructs);
  }

  /**
   * Attaches the given list of permissions to allow the service
   * to access other AWS resources.
   *
   * @example
   * ```js
   * service.attachPermissions(["sns"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    this.devFunction?.attachPermissions(permissions);
    this.attachPermissionsForService(permissions);
  }

  /**
   * Attaches additional environment variable to the service.
   *
   * @example
   * ```js
   * service.addEnvironment({
   *   DEBUG: "*"
   * });
   * ```
   */
  public addEnvironment(name: string, value: string): void {
    this.devFunction?.addEnvironment(name, value);
    this.addEnvironmentForService(name, value);
  }

  /////////////////////
  // Bundle Cluster
  /////////////////////

  private validateServiceExists() {
    const { path: servicePath, file } = this.props;

    // Validate path exists
    if (!fs.existsSync(servicePath)) {
      throw new VisibleError(
        `In the "${this.node.id}" Service, path is not found at "${path.resolve(
          servicePath
        )}"`
      );
    }

    // Validate path is a directory
    if (fs.statSync(servicePath).isFile()) {
      throw new VisibleError(
        [
          `In the "${this.node.id}" Service, the path "${path.resolve(
            servicePath
          )}" should be a directory.`,
          `Did you mean:`,
          ``,
          `  {`,
          `    path: "${path.dirname(servicePath)}",`,
          `    file: "${path.basename(servicePath)}",`,
          `  }`,
        ].join("\n")
      );
    }

    // Validate path exists
    if (file) {
      const dockerfilePath = path.join(servicePath, file);
      if (!fs.existsSync(dockerfilePath)) {
        throw new VisibleError(
          `In the "${this.node.id}" Service, no Dockerfile is found at "${dockerfilePath}". Make sure to set the "file" property to the path of the Dockerfile relative to "${servicePath}".`
        );
      }
    }
  }

  private validateMemoryAndCpu() {
    const { memory, cpu } = this.props;
    if (!supportedCpus[cpu]) {
      throw new VisibleError(
        `In the "${
          this.node.id
        }" Service, only the following "cpu" settings are supported: ${Object.keys(
          supportedCpus
        ).join(", ")}`
      );
    }

    // @ts-ignore
    if (!supportedMemories[cpu][memory]) {
      throw new VisibleError(
        `In the "${
          this.node.id
        }" Service, only the following "memory" settings are supported with "${cpu}": ${Object.keys(
          supportedMemories[cpu]
        ).join(", ")}`
      );
    }
  }

  private createVpc() {
    const { cdk } = this.props;

    return (
      cdk?.vpc ??
      new Vpc(this, "Vpc", {
        natGateways: 1,
      })
    );
  }

  private createService(vpc: IVpc) {
    const { architecture, cpu, memory, port, logRetention, cdk } = this.props;
    const app = this.node.root as App;
    const clusterName = app.logicalPrefixedName(this.node.id);

    const logGroup = new LogRetention(this, "LogRetention", {
      logGroupName: `/sst/service/${clusterName}`,
      retention:
        RetentionDays[logRetention.toUpperCase() as keyof typeof RetentionDays],
      logRetentionRetryOptions: {
        maxRetries: 100,
      },
    });

    const cluster = new Cluster(this, "Cluster", {
      clusterName,
      vpc,
    });

    const taskDefinition = new FargateTaskDefinition(this, `TaskDefinition`, {
      // @ts-ignore
      memoryLimitMiB: supportedMemories[cpu][memory],
      cpu: supportedCpus[cpu],
      runtimePlatform: {
        cpuArchitecture:
          architecture === "arm64"
            ? CpuArchitecture.ARM64
            : CpuArchitecture.X86_64,
      },
    });

    const container = taskDefinition.addContainer("Container", {
      logging: new AwsLogDriver({
        logGroup: LogGroup.fromLogGroupArn(
          this,
          "LogGroup",
          logGroup.logGroupArn
        ),
        streamPrefix: "service",
      }),
      portMappings: [{ containerPort: port }],
      environment: {
        SST_APP: app.name,
        SST_STAGE: app.stage,
        SST_SSM_PREFIX: useProject().config.ssmPrefix,
      },
      ...cdk?.container,
      image: cdk?.container?.image ?? {
        bind: () => ({ imageName: "placeholder" }),
      },
    });

    const service = new FargateService(this, "Service", {
      cluster,
      taskDefinition,
      ...cdk?.fargateService,
    });

    return { cluster, taskDefinition, container, service };
  }

  private createLoadBalancer(vpc: IVpc, service: FargateService) {
    const { cdk } = this.props;

    // Do not create load balancer if disabled
    if (cdk?.applicationLoadBalancer === false) {
      if (cdk?.applicationLoadBalancerTargetGroup)
        throw new VisibleError(
          `In the "${this.node.id}" Service, the "cdk.applicationLoadBalancerTargetGroup" cannot be applied if the Application Load Balancer is diabled.`
        );
      return {};
    }

    const alb = new ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc,
      internetFacing: true,
      ...(cdk?.applicationLoadBalancer === true
        ? {}
        : cdk?.applicationLoadBalancer),
    });
    const listener = alb.addListener("Listener", { port: 80 });
    const target = listener.addTargets("TargetGroup", {
      port: 80,
      targets: [service],
      ...cdk?.applicationLoadBalancerTargetGroup,
    });
    return { alb, target };
  }

  private createAutoScaling(
    service: FargateService,
    target?: ApplicationTargetGroup
  ) {
    const {
      minContainers,
      maxContainers,
      cpuUtilization,
      memoryUtilization,
      requestsPerContainer,
    } = this.props.scaling ?? {};

    const scaling = service.autoScaleTaskCount({
      minCapacity: minContainers ?? 1,
      maxCapacity: maxContainers ?? 1,
    });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: cpuUtilization ?? 70,
      scaleOutCooldown: CdkDuration.seconds(300),
    });
    scaling.scaleOnMemoryUtilization("MemoryScaling", {
      targetUtilizationPercent: memoryUtilization ?? 70,
      scaleOutCooldown: CdkDuration.seconds(300),
    });
    if (target) {
      scaling.scaleOnRequestCount("RequestScaling", {
        requestsPerTarget: requestsPerContainer ?? 500,
        targetGroup: target,
      });
    }
  }

  private createDistribution(alb?: ApplicationLoadBalancer) {
    const { cdk, customDomain } = this.props;

    // Do not create distribution if disabled or if ALB was not created (ie. disabled)
    if (!alb || cdk?.cloudfrontDistribution === false) return;

    const cachePolicy = new CachePolicy(this, "CachePolicy", {
      queryStringBehavior: CacheQueryStringBehavior.all(),
      headerBehavior: CacheHeaderBehavior.none(),
      cookieBehavior: CacheCookieBehavior.none(),
      defaultTtl: CdkDuration.days(0),
      maxTtl: CdkDuration.days(365),
      minTtl: CdkDuration.days(0),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      comment: "SST server response cache policy",
    });

    return new Distribution(this, "CDN", {
      customDomain,
      cdk: {
        distribution: {
          defaultRootObject: "",
          defaultBehavior: {
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            origin: new HttpOrigin(alb.loadBalancerDnsName, {
              protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
              readTimeout: CdkDuration.seconds(60),
            }),
            allowedMethods: AllowedMethods.ALLOW_ALL,
            cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
            compress: true,
            cachePolicy,
            originRequestPolicy: OriginRequestPolicy.ALL_VIEWER,
          },
          ...(cdk?.cloudfrontDistribution === true
            ? {}
            : cdk?.cloudfrontDistribution),
        },
      },
    });
  }

  private createDevFunction() {
    const { permissions, environment, bind } = this.props;

    const app = this.node.root as App;
    const role = new Role(this, "ServerFunctionRole", {
      assumedBy: new CompositePrincipal(
        new AccountPrincipal(app.account),
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      maxSessionDuration: CdkDuration.hours(12),
    });

    return new Function(this, `ServerFunction`, {
      description: "Service dev function",
      handler: path.join(
        __dirname,
        "../support/service-dev-function",
        "index.handler"
      ),
      runtime: "nodejs18.x",
      memorySize: "512 MB",
      timeout: "10 seconds",
      role,
      bind,
      environment,
      permissions,
      _doNotAllowOthersToBind: true,
    });
  }

  private bindForService(constructs: SSTConstruct[]): void {
    // Get referenced secrets
    const referencedSecrets: Secret[] = [];
    constructs.forEach((c) =>
      referencedSecrets.push(...getReferencedSecrets(c))
    );

    [...constructs, ...referencedSecrets].forEach((c) => {
      // Bind environment
      const env = bindEnvironment(c);
      Object.entries(env).forEach(([key, value]) =>
        this.addEnvironmentForService(key, value)
      );

      // Bind permissions
      const permissions = bindPermissions(c);
      Object.entries(permissions).forEach(([action, resources]) =>
        this.attachPermissionsForService([
          new PolicyStatement({
            actions: [action],
            effect: Effect.ALLOW,
            resources,
          }),
        ])
      );
    });
  }

  private addEnvironmentForService(name: string, value: string): void {
    this.container?.addEnvironment(name, value);
  }

  private attachPermissionsForService(permissions: Permissions): void {
    if (!this.taskDefinition) return;
    attachPermissionsToRole(this.taskDefinition.taskRole as Role, permissions);
  }

  /////////////////////
  // Build App
  /////////////////////

  private async createNixpacksBuilder() {
    try {
      await execAsync(
        [
          "docker",
          "build",
          `-t ${NIXPACKS_IMAGE_NAME}`,
          "--platform=linux/amd64",
          path.resolve(__dirname, "../support/nixpacks"),
        ].join(" "),
        {
          env: {
            ...process.env,
          },
        }
      );
    } catch (e) {
      console.error(e);
      throw new VisibleError(
        `Failed to setup Nixpacks builder for the ${this.node.id} service`
      );
    }
  }

  private async runNixpacksBuild() {
    const { path: servicePath } = this.props;
    try {
      await execAsync(
        [
          "docker",
          "run",
          "--rm",
          "--network=host",
          `--name=sst-${this.node.id}-service`,
          `-v=${path.resolve(servicePath)}:/service`,
          `-w="/service"`,
          NIXPACKS_IMAGE_NAME,
          `build . --out .`,
        ].join(" "),
        {
          env: {
            ...process.env,
          },
        }
      );
    } catch (e) {
      console.error(e);
      throw new VisibleError(
        `Failed to run Nixpacks build for the ${this.node.id} service`
      );
    }
    return ".nixpacks/Dockerfile";
  }

  private async runDockerBuild(dockerfile: string) {
    const { path: servicePath, architecture, build } = this.props;
    const platform = architecture === "arm64" ? "linux/arm64" : "linux/amd64";
    try {
      await execAsync(
        [
          "docker",
          "build",
          `-t sst-build:service-${this.node.id}`,
          `--platform ${platform}`,
          `-f ${path.join(servicePath, dockerfile)}`,
          ...Object.entries(build?.buildArgs || {}).map(
            ([k, v]) => `--build-arg ${k}=${v}`
          ),
          this.props.path,
        ].join(" "),
        {
          env: {
            ...process.env,
          },
        }
      );
    } catch (e) {
      console.error(e);
      throw new VisibleError(`Failed to build the ${this.node.id} service`);
    }
  }

  private updateContainerImage(
    dockerfile: string,
    taskDefinition: FargateTaskDefinition,
    container: ContainerDefinition
  ) {
    const { path: servicePath, architecture, build } = this.props;
    const image = ContainerImage.fromAsset(servicePath, {
      platform:
        architecture === "arm64" ? Platform.LINUX_ARM64 : Platform.LINUX_AMD64,
      file: dockerfile,
      buildArgs: build?.buildArgs,
      exclude: [".sst/dist", ".sst/artifacts"],
      ignoreMode: IgnoreMode.GLOB,
    });
    const cfnTask = taskDefinition.node.defaultChild as CfnTaskDefinition;
    cfnTask.addPropertyOverride(
      "ContainerDefinitions.0.Image",
      image.bind(this, container).imageName
    );
  }
}

export const useServices = createAppContext(() => {
  const sites: {
    stack: string;
    name: string;
    props: ServiceNormalizedProps;
  }[] = [];
  return {
    add(stack: string, name: string, props: ServiceNormalizedProps) {
      sites.push({ stack, name, props });
    },
    get all() {
      return sites;
    },
  };
});
