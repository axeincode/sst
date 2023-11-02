import { test, expect, beforeAll, vi } from "vitest";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import {
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
  arrayWith,
  printResource,
  ANY,
  ABSENT,
  createApp,
} from "./helper.js";
import { Config, Stack, Topic, Service } from "../../dist/constructs";
import { ServiceProps } from "../../dist/constructs/Service";
import { HttpVersion } from "aws-cdk-lib/aws-cloudfront";

const servicePath = "test/constructs/service";

async function createService(
  props?: ServiceProps | ((stack: Stack) => ServiceProps)
) {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const service = new Service(stack, "Service", {
    path: servicePath,
    ...(typeof props === "function" ? props(stack) : props),
  });
  await app.finish();
  return { app, stack, service };
}

/////////////////////////////
// Test Constructor
/////////////////////////////

test("default", async () => {
  const { service, stack } = await createService();
  expect(service.url).toBeDefined();
  expect(service.customDomainUrl).toBeUndefined();
  expect(service.cdk?.vpc).toBeDefined();
  expect(service.cdk?.cluster).toBeDefined();
  expect(service.cdk?.fargateService).toBeDefined();
  expect(service.cdk?.taskDefinition).toBeDefined();
  expect(service.cdk?.distribution?.distributionId).toBeDefined();
  expect(service.cdk?.distribution?.distributionDomainName).toBeDefined();
  expect(service.cdk?.applicationLoadBalancer).toBeDefined();
  expect(service.cdk?.certificate).toBeUndefined();
  countResources(stack, "AWS::EC2::VPC", 1);
  hasResource(stack, "AWS::EC2::VPC", {
    CidrBlock: "10.0.0.0/16",
  });
  countResources(stack, "AWS::ECS::Cluster", 1);
  hasResource(stack, "AWS::ECS::Cluster", {
    ClusterName: "test-app-Service",
  });
  countResources(stack, "AWS::ECS::TaskDefinition", 1);
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        Environment: [
          { Name: "SST_APP", Value: "app" },
          { Name: "SST_STAGE", Value: "test" },
          { Name: "SST_SSM_PREFIX", Value: "/test/test/" },
        ],
        LogConfiguration: objectLike({
          LogDriver: "awslogs",
          Options: objectLike({
            "awslogs-stream-prefix": "service",
          }),
        }),
        Name: "Container",
        PortMappings: [{ ContainerPort: 3000, Protocol: "tcp" }],
      }),
    ],
    Cpu: "256",
    Memory: "512",
    NetworkMode: "awsvpc",
    TaskRoleArn: {
      "Fn::GetAtt": ["ServiceTaskDefinitionTaskRole3BD32B0F", "Arn"],
    },
  });
  countResources(stack, "AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
  hasResource(stack, "AWS::ElasticLoadBalancingV2::LoadBalancer", {
    Type: "application",
  });
  countResources(stack, "AWS::ApplicationAutoScaling::ScalableTarget", 1);
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalableTarget", {
    MaxCapacity: 1,
    MinCapacity: 1,
  });
  countResources(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", 3);
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: {
        PredefinedMetricType: "ECSServiceAverageCPUUtilization",
      },
      ScaleOutCooldown: 300,
      TargetValue: 70,
    }),
  });
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: {
        PredefinedMetricType: "ECSServiceAverageMemoryUtilization",
      },
      ScaleOutCooldown: 300,
      TargetValue: 70,
    }),
  });
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: objectLike({
        PredefinedMetricType: "ALBRequestCountPerTarget",
      }),
      TargetValue: 500,
    }),
  });
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
      DefaultCacheBehavior: {
        AllowedMethods: [
          "GET",
          "HEAD",
          "OPTIONS",
          "PUT",
          "PATCH",
          "POST",
          "DELETE",
        ],
        CachePolicyId: {
          Ref: "ServiceCachePolicy981DB928",
        },
        CachedMethods: ["GET", "HEAD", "OPTIONS"],
        Compress: true,
        TargetOriginId: "testappstackServiceCDNDistributionOrigin167AADC47",
        ViewerProtocolPolicy: "redirect-to-https",
      },
      DefaultRootObject: "",
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "http-only",
            OriginSSLProtocols: ["TLSv1.2"],
          },
          DomainName: {
            "Fn::GetAtt": ["ServiceLoadBalancer31A7DB79", "DNSName"],
          },
          Id: "testappstackServiceCDNDistributionOrigin167AADC47",
        },
      ],
    },
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
});

test("path: not exist", async () => {
  expect(async () => {
    await createService({
      path: "does-not-exist",
    });
  }).rejects.toThrow(/path is not found/);
});

test("customDomain: string", async () => {
  HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new HostedZone(scope, id, { zoneName: domainName });
    });
  const { service, stack } = await createService({
    customDomain: "domain.com",
  });
  expect(service.customDomainUrl).toEqual("https://domain.com");
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Aliases: ["domain.com"],
    }),
  });
});

test("architecture: undefined", async () => {
  const { stack } = await createService({});
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    RuntimePlatform: objectLike({
      CpuArchitecture: "X86_64",
    }),
  });
});
test("architecture: defined", async () => {
  const { stack } = await createService({
    architecture: "arm64",
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    RuntimePlatform: objectLike({
      CpuArchitecture: "ARM64",
    }),
  });
});

test("cpu undefined", async () => {
  const { stack } = await createService({});
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    Cpu: "256",
  });
});
test("cpu defined", async () => {
  const { service, stack } = await createService({
    cpu: "1 vCPU",
    memory: "2 GB",
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    Cpu: "1024",
  });
});
test("cpu invalid", async () => {
  expect(async () => {
    await createService({
      // @ts-expect-error
      cpu: "3 vCPU",
    });
  }).rejects.toThrow(/only the following "cpu" settings/);
});

test("memory undefined", async () => {
  const { stack } = await createService({});
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    Memory: "512",
  });
});
test("memory defined", async () => {
  const { service, stack } = await createService({
    memory: "1 GB",
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    Memory: "1024",
  });
});
test("memory invalid", async () => {
  expect(async () => {
    await createService({
      memory: "10000 GB",
    });
  }).rejects.toThrow(/only the following "memory" settings/);
});

test("port undefined", async () => {
  const { stack } = await createService({});
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        PortMappings: [{ ContainerPort: 3000, Protocol: "tcp" }],
      }),
    ],
  });
});
test("port defined", async () => {
  const { service, stack } = await createService({
    port: 8080,
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        PortMappings: [{ ContainerPort: 8080, Protocol: "tcp" }],
      }),
    ],
  });
});

test("file defiend", async () => {
  const { service, stack } = await createService({
    path: "test/constructs/service-custom-Dockerfile",
    file: "child/Dockerfile.prod",
  });
  countResources(stack, "AWS::ECS::TaskDefinition", 1);
});
test("file invalid", async () => {
  expect(async () => {
    await createService({
      file: "path/to/garbage",
    });
  }).rejects.toThrow(/no Dockerfile is found/);
});

test("logRetention undefined", async () => {
  const { stack } = await createService({});
  hasResource(stack, "Custom::LogRetention", {
    RetentionInDays: ABSENT,
    LogGroupName: "/sst/service/test-app-Service",
  });
});
test("logRetention defined", async () => {
  const { service, stack } = await createService({
    logRetention: "one_month",
  });
  hasResource(stack, "Custom::LogRetention", {
    RetentionInDays: 30,
    LogGroupName: "/sst/service/test-app-Service",
  });
});

test("scaling.minContainers undefined", async () => {
  const { service, stack } = await createService();
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalableTarget", {
    MinCapacity: 1,
  });
});
test("scaling.minContainers defined", async () => {
  const { service, stack } = await createService({
    scaling: {
      minContainers: 10,
      maxContainers: 10,
    },
  });
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalableTarget", {
    MinCapacity: 10,
  });
});

test("scaling.maxContainers undefined", async () => {
  const { service, stack } = await createService();
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalableTarget", {
    MaxCapacity: 1,
  });
});
test("scaling.maxContainers defined", async () => {
  const { service, stack } = await createService({
    scaling: {
      maxContainers: 10,
    },
  });
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalableTarget", {
    MaxCapacity: 10,
  });
});

test("scaling.cpuUtilization undefined", async () => {
  const { service, stack } = await createService();
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: {
        PredefinedMetricType: "ECSServiceAverageCPUUtilization",
      },
      TargetValue: 70,
    }),
  });
});
test("scaling.cpuUtilization defined", async () => {
  const { service, stack } = await createService({
    scaling: {
      cpuUtilization: 50,
    },
  });
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: {
        PredefinedMetricType: "ECSServiceAverageCPUUtilization",
      },
      TargetValue: 50,
    }),
  });
});

test("scaling.memoryUtilization undefined", async () => {
  const { service, stack } = await createService();
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: {
        PredefinedMetricType: "ECSServiceAverageMemoryUtilization",
      },
      TargetValue: 70,
    }),
  });
});
test("scaling.memoryUtilization defined", async () => {
  const { service, stack } = await createService({
    scaling: {
      memoryUtilization: 50,
    },
  });
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: {
        PredefinedMetricType: "ECSServiceAverageMemoryUtilization",
      },
      TargetValue: 50,
    }),
  });
});

test("scaling.requestsPerContainer undefined", async () => {
  const { service, stack } = await createService();
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: objectLike({
        PredefinedMetricType: "ALBRequestCountPerTarget",
      }),
      TargetValue: 500,
    }),
  });
});
test("scaling.requestsPerContainer defined", async () => {
  const { service, stack } = await createService({
    scaling: {
      requestsPerContainer: 1000,
    },
  });
  hasResource(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", {
    TargetTrackingScalingPolicyConfiguration: objectLike({
      PredefinedMetricSpecification: objectLike({
        PredefinedMetricType: "ALBRequestCountPerTarget",
      }),
      TargetValue: 1000,
    }),
  });
});

test("bind", async () => {
  const { stack } = await createService((stack) => {
    const topic = new Topic(stack, "Topic");
    const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
      value: topic.topicArn,
    });
    return {
      bind: [MY_TOPIC_ARN],
    };
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        Environment: arrayWith([
          objectLike({ Name: "SST_Parameter_value_MY_TOPIC_ARN", Value: ANY }),
        ]),
      }),
    ],
  });
});

test("permissions", async () => {
  const { stack } = await createService((stack) => {
    const topic = new Topic(stack, "Topic");
    return {
      permissions: [topic],
    };
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "sns:*" })]),
    }),
  });
});

test("environment", async () => {
  const { stack } = await createService({
    environment: {
      DEBUG: "*",
    },
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        Environment: arrayWith([objectLike({ Name: "DEBUG", Value: "*" })]),
      }),
    ],
  });
});

test("cdk.fargateService", async () => {
  const { stack } = await createService({
    cdk: {
      fargateService: {
        circuitBreaker: { rollback: true },
      },
    },
  });
  hasResource(stack, "AWS::ECS::Service", {
    LaunchType: "FARGATE",
    DeploymentConfiguration: {
      DeploymentCircuitBreaker: {
        Rollback: true,
      },
    },
  });
});

test("cdk.container: image defined", async () => {
  const { stack } = await createService({
    cdk: {
      container: {
        image: ContainerImage.fromRegistry(
          "public.ecr.aws/amazonlinux/amazonlinux:latest"
        ),
      },
    },
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        Image: "public.ecr.aws/amazonlinux/amazonlinux:latest",
      }),
    ],
  });
});
test("cdk.container: healthCheck defined", async () => {
  const { stack } = await createService({
    cdk: {
      container: {
        healthCheck: {
          command: ["CMD-SHELL", "cmd"],
        },
      },
    },
  });
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        HealthCheck: objectLike({
          Command: ["CMD-SHELL", "cmd"],
        }),
      }),
    ],
  });
});

test("cdk.cloudfrontDistribution is false", async () => {
  const { stack, service } = await createService({
    cdk: {
      cloudfrontDistribution: false,
    },
  });
  countResources(stack, "AWS::ECS::Cluster", 1);
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
  expect(service.url).toBeUndefined();
  expect(service.cdk?.vpc).toBeDefined();
  expect(service.cdk?.cluster).toBeDefined();
  expect(service.cdk?.fargateService).toBeDefined();
  expect(service.cdk?.taskDefinition).toBeDefined();
  expect(service.cdk?.distribution).toBeUndefined();
});
test("cdk.cloudfrontDistribution is props", async () => {
  const { stack, service } = await createService({
    cdk: {
      cloudfrontDistribution: {
        httpVersion: HttpVersion.HTTP1_1,
      },
    },
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      HttpVersion: "http1.1",
    }),
  });
});

test("cdk.applicationLoadBalancer is false", async () => {
  const { stack, service } = await createService({
    cdk: {
      applicationLoadBalancer: false,
    },
  });
  countResources(stack, "AWS::ECS::Cluster", 1);
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
  countResources(stack, "AWS::ElasticLoadBalancingV2::LoadBalancer", 0);
  countResources(stack, "AWS::ApplicationAutoScaling::ScalingPolicy", 2);
  expect(service.url).toBeUndefined();
  expect(service.cdk?.vpc).toBeDefined();
  expect(service.cdk?.cluster).toBeDefined();
  expect(service.cdk?.fargateService).toBeDefined();
  expect(service.cdk?.taskDefinition).toBeDefined();
  expect(service.cdk?.distribution).toBeUndefined();
  expect(service.cdk?.applicationLoadBalancer).toBeUndefined();
});
test("cdk.applicationLoadBalancer is props", async () => {
  const { stack, service } = await createService({
    cdk: {
      applicationLoadBalancer: {
        http2Enabled: false,
      },
    },
  });
  expect(service.cdk?.applicationLoadBalancer).toBeDefined();
  hasResource(stack, "AWS::ElasticLoadBalancingV2::LoadBalancer", {
    LoadBalancerAttributes: arrayWith([
      {
        Key: "routing.http2.enabled",
        Value: "false",
      },
    ]),
  });
});
test("cdk.applicationLoadBalancerTargetGroup", async () => {
  const { service, stack } = await createService({
    cdk: {
      applicationLoadBalancerTargetGroup: {
        healthCheck: {
          healthyHttpCodes: "200, 302",
          path: "/health",
        },
      },
    },
  });
  hasResource(stack, "AWS::ElasticLoadBalancingV2::TargetGroup", {
    Matcher: {
      HttpCode: "200, 302",
    },
    HealthCheckPath: "/health",
  });
});
test("cdk.applicationLoadBalancerTargetGroup: ALB disabled", async () => {
  expect(async () => {
    await createService({
      cdk: {
        applicationLoadBalancer: false,
        applicationLoadBalancerTargetGroup: {
          healthCheck: {
            healthyHttpCodes: "200, 302",
            path: "/health",
          },
        },
      },
    });
  }).rejects.toThrow(
    /"cdk.applicationLoadBalancerTargetGroup" cannot be applied/
  );
});

test("sst deploy inactive stack", async () => {
  const app = await createApp({
    mode: "deploy",
    isActiveStack(stackName) {
      return false;
    },
  });
  const stack = new Stack(app, "stack");
  const service = new Service(stack, "Service", {
    path: servicePath,
  });
  await app.finish();
  expect(service.url).toBeUndefined();
  expect(service.customDomainUrl).toBeUndefined();
  expect(service.cdk).toBeUndefined();
  countResources(stack, "AWS::ECS::Cluster", 0);
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("sst dev: dev.url undefined", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const service = new Service(stack, "Service", {
    path: servicePath,
  });
  await app.finish();
  expect(service.url).toBeUndefined();
  expect(service.customDomainUrl).toBeUndefined();
  expect(service.cdk).toBeUndefined();
  countResources(stack, "AWS::ECS::Cluster", 0);
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});
test("sst dev: dev.url string", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const service = new Service(stack, "Service", {
    path: servicePath,
    dev: {
      url: "localhost:3000",
    },
  });
  await app.finish();
  expect(service.url).toBe("localhost:3000");
});
test("sst dev: disablePlaceholder true", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const service = new Service(stack, "Service", {
    path: servicePath,
    dev: {
      deploy: true,
    },
  });
  await app.finish();
  expect(service.url).toBeDefined();
  countResources(stack, "AWS::ECS::Cluster", 1);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
});

test("sst remove", async () => {
  const app = await createApp({ mode: "remove" });
  const stack = new Stack(app, "stack");
  const service = new Service(stack, "Service", {
    path: servicePath,
  });
  await app.finish();
  expect(service.url).toBeUndefined();
  expect(service.customDomainUrl).toBeUndefined();
  expect(service.cdk).toBeUndefined();
  countResources(stack, "AWS::ECS::Cluster", 0);
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("bind()", async () => {
  const { service, stack } = await createService();
  const topic = new Topic(stack, "Topic");
  const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
    value: topic.topicArn,
  });
  service.bind([MY_TOPIC_ARN]);
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        Environment: arrayWith([
          objectLike({ Name: "SST_Parameter_value_MY_TOPIC_ARN", Value: ANY }),
        ]),
      }),
    ],
  });
});

test("attachPermissions()", async () => {
  const { service, stack } = await createService({});
  service.attachPermissions(["sns"]);
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: {
      Statement: arrayWith([
        {
          Action: "sns:*",
          Effect: "Allow",
          Resource: "*",
        },
      ]),
      Version: "2012-10-17",
    },
  });
});

test("addEnvironment()", async () => {
  const { service, stack } = await createService();
  service.addEnvironment("DEBUG", "*");
  hasResource(stack, "AWS::ECS::TaskDefinition", {
    ContainerDefinitions: [
      objectLike({
        Environment: arrayWith([objectLike({ Name: "DEBUG", Value: "*" })]),
      }),
    ],
  });
});
