/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-empty-function */

import {
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
  stringLike,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as sns from "@aws-cdk/aws-sns";
import { ABSENT } from "@aws-cdk/assert";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import {
  Api,
  AppSyncApi,
  WebSocketApi,
  ApiGatewayV1Api,
  App,
  Stack,
  Table,
  TableFieldType,
  Bucket,
  EventBus,
  Function,
  HandlerProps,
  FunctionProps,
  FunctionHandlerProps,
  PermissionType,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test constructor
/////////////////////////////

test("non-namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as HandlerProps;
  expect(handlerProps).toBeDefined();
});

test("namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as FunctionHandlerProps;
  expect(handlerProps).toBeDefined();
});

test("constructor: props with minimum config", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 10,
      MemorySize: 1024,
      TracingConfig: { Mode: "Active" },
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::EventInvokeConfig", 0));
});

test("constructor: props with full config", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 20,
    memorySize: 512,
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 20,
      MemorySize: 512,
    })
  );
});

test("constructor: props without handler", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {});
  }).toThrow(/No handler defined/);
});

test("constructor: props disabling live development ", async () => {
  const stack = new Stack(
    new App({
      debugEndpoint: "placeholder",
      debugBucketArn: "placeholder",
      debugBucketName: "placeholder",
    }),
    "stack"
  );
  new Function(stack, "Function", {
    enableLiveDev: false,
    handler: "test/lambda.handler",
  });
  expectCdk(stack).notTo(
    haveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          SST_DEBUG_SRC_PATH: ".",
          SST_DEBUG_SRC_HANDLER: "test/lambda.handler",
          SST_DEBUG_ENDPOINT: "placeholder",
          SST_DEBUG_BUCKET_NAME: "placeholder",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
});

test("constructor: liveDev prop defaults to true", async () => {
  const stack = new Stack(
    new App({
      debugEndpoint: "placeholder",
      debugBucketArn: "placeholder",
      debugBucketName: "placeholder",
    }),
    "stack"
  );
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Environment: {
        Variables: {
          SST_DEBUG_SRC_PATH: ".",
          SST_DEBUG_SRC_HANDLER: "test/lambda.handler",
          SST_DEBUG_ENDPOINT: "placeholder",
          SST_DEBUG_BUCKET_NAME: "placeholder",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
});

test("constructor: handler is jsx", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda-jsx.handler",
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
});

test("constructor: handler not exist", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/random.handler",
    });
  }).toThrow(/Cannot find a handler file for "test\/random.handler"/);
});

test("constructor: srcPath not set for python", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: lambda.Runtime.PYTHON_3_8,
    });
  }).toThrow(/Cannot set the "srcPath" to the project root/);
});

test("srcPath-project-root-python", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      srcPath: ".",
      handler: "test/lambda.handler",
      runtime: lambda.Runtime.PYTHON_3_8,
    });
  }).toThrow(/Cannot set the "srcPath" to the project root/);
});

test("copyFiles", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bundle: {
      copyFiles: [{ from: "test/lambda.js", to: "test/lambda.js" }],
    },
  });
});

test("runtime-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    runtime: "nodejs10.x",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Runtime: "nodejs10.x",
    })
  );
});

test("runtime-string-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: "java8",
    });
  }).toThrow(/The specified runtime is not supported/);
});

test("runtime-class", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    runtime: lambda.Runtime.NODEJS_10_X,
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Runtime: "nodejs10.x",
    })
  );
});

test("runtime-class-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: lambda.Runtime.JAVA_11,
    });
  }).toThrow(/The specified runtime is not supported/);
});

test("timeout-number", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 15,
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Timeout: 15,
    })
  );
});

test("timeout-class", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: cdk.Duration.seconds(15),
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Timeout: 15,
    })
  );
});

test("xray-disabled", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    tracing: lambda.Tracing.DISABLED,
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      TracingConfig: ABSENT,
    })
  );
});

test("permissions", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    permissions: ["s3", "dynamodb:Get"],
  });
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
          { Action: "dynamodb:Get", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("bundle: esbuildConfig", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bundle: {
      esbuildConfig: "test/function/esbuild-config.js",
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
});

test("bundle: esbuildConfig (from config)", async () => {
  const app = new App({
    esbuildConfig: "test/function/esbuild-config.js",
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
});

test("bundle: esbuildConfig error invalid plugin", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      bundle: {
        esbuildConfig: "test/function/esbuild-config-invalid.js",
      },
    });
  }).toThrow(/There was a problem transpiling the Lambda handler./);
});

test("bundle: esbuildConfig error invalid plugin (from config)", async () => {
  const app = new App({
    esbuildConfig: "test/function/esbuild-config-invalid.js",
  });
  const stack = new Stack(app, "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
    });
  }).toThrow(/There was a problem transpiling the Lambda handler./);
});

test("bundle: esbuildConfig error non-plugins key", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      bundle: {
        esbuildConfig: "test/function/esbuild-config-non-plugins.js",
      },
    });
  }).toThrow(/There was a problem transpiling the Lambda handler./);
});

test("bundle: commandHooks-beforeBundling success", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bundle: {
      commandHooks: {
        beforeBundling: (): string[] => {
          return ["echo beforeBundling"];
        },
        beforeInstall: (): string[] => {
          return [];
        },
        afterBundling: (): string[] => {
          return [];
        },
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
});

test("bundle: commandHooks-beforeBundling failed", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      bundle: {
        commandHooks: {
          beforeBundling: (): string[] => {
            return ["non-exist-command"];
          },
          beforeInstall: (): string[] => {
            return [];
          },
          afterBundling: (): string[] => {
            return [];
          },
        },
      },
    });
  }).toThrow(/Command failed: non-exist-command/);
});

test("layers: imported from another stack", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = new lambda.LayerVersion(stack1, "MyLayer", {
    code: lambda.Code.fromAsset("test"),
  });
  new Function(stack1, "Function", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "Function", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  expect(stack2.dependencies).toEqual([stack1]);

  expectCdk(stack1).to(countResources("AWS::SSM::Parameter", 1));
  expectCdk(stack1).to(
    haveResource("AWS::SSM::Parameter", {
      Value: { Ref: stringLike("MyLayer*") },
    })
  );
  expectCdk(stack1).to(countResources("AWS::Lambda::LayerVersion", 1));
  expectCdk(stack1).to(
    haveResource("AWS::Lambda::Function", {
      Layers: [{ Ref: stringLike("MyLayer*") }],
    })
  );

  expectCdk(stack2).to(countResources("AWS::SSM::Parameter", 0));
  expectCdk(stack2).to(countResources("AWS::Lambda::LayerVersion", 0));
  expectCdk(stack2).to(
    haveResource("AWS::Lambda::Function", {
      Layers: [{ Ref: stringLike("SsmParameterValue*") }],
    })
  );
});

test("layers: imported from another stack multiple times", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = new lambda.LayerVersion(stack1, "MyLayer", {
    code: lambda.Code.fromAsset("test"),
  });
  new Function(stack1, "Function", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "FunctionA", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "FunctionB", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  expectCdk(stack1).to(countResources("AWS::SSM::Parameter", 1));
  expectCdk(stack1).to(countResources("AWS::Lambda::LayerVersion", 1));
  expectCdk(stack1).to(
    haveResource("AWS::Lambda::Function", {
      Layers: [{ Ref: stringLike("MyLayer*") }],
    })
  );

  expectCdk(stack2).to(countResources("AWS::SSM::Parameter", 0));
  expectCdk(stack2).to(countResources("AWS::Lambda::LayerVersion", 0));
  expectCdk(stack2).to(
    countResourcesLike("AWS::Lambda::Function", 2, {
      Layers: [{ Ref: stringLike("SsmParameterValue*") }],
    })
  );
});

test("layers: imported from ARN", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = lambda.LayerVersion.fromLayerVersionArn(
    stack1,
    "MyLayer",
    "arn"
  );
  new Function(stack1, "Function", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "Function", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  expectCdk(stack1).to(countResources("AWS::SSM::Parameter", 0));
  expectCdk(stack1).to(countResources("AWS::Lambda::LayerVersion", 0));
  expectCdk(stack1).to(
    haveResource("AWS::Lambda::Function", {
      Layers: ["arn"],
    })
  );

  expectCdk(stack2).to(countResources("AWS::SSM::Parameter", 0));
  expectCdk(stack2).to(countResources("AWS::Lambda::LayerVersion", 0));
  expectCdk(stack2).to(
    haveResource("AWS::Lambda::Function", {
      Layers: ["arn"],
    })
  );
});

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: debugIncreaseTimeout true", async () => {
  const app = new App({
    synthCallback: () => {},
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
    debugIncreaseTimeout: true,
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Timeout: 900,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::EventInvokeConfig", {
      MaximumRetryAttempts: 0,
    })
  );
});

test("constructor: debugIncreaseTimeout false", async () => {
  const app = new App({
    synthCallback: () => {},
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
    debugIncreaseTimeout: false,
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Timeout: 10,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::EventInvokeConfig", {
      MaximumRetryAttempts: 0,
    })
  );
});

/////////////////////////////
// Test attachPermissions - generic
/////////////////////////////

test("attachPermission-string-all", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions(PermissionType.ALL);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-string-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    f.attachPermissions("abc" as PermissionType.ALL);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermission-array-empty", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [lambdaDefaultPolicy],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-string", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions(["s3", "dynamodb:Get"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
          { Action: "dynamodb:Get", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-sst-api", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {
    routes: { "GET /": "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:execute-api:us-east-1:my-account:",
                  { Ref: "ApiCD79AAA0" },
                  "/*",
                ],
              ],
            },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-sst-ApiGatewayV1Api", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
    routes: { "GET /": "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:execute-api:us-east-1:my-account:",
                  { Ref: "ApiCD79AAA0" },
                  "/*",
                ],
              ],
            },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-sst-AppSyncApi", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: { "Query notes": "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "appsync:GraphQL",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:appsync:us-east-1:my-account:apis/",
                  { "Fn::GetAtt": ["ApiCD79AAA0", "ApiId"] },
                  "/*",
                ],
              ],
            },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-sst-WebSocketApi", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: { $connect: "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:execute-api:us-east-1:my-account:",
                  { Ref: "ApiCD79AAA0" },
                  "/*",
                ],
              ],
            },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-sst-Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "functionA", {
    handler: "test/lambda.handler",
  });
  const f2 = new Function(stack, "functionB", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([f2]);

  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "lambda:*",
            Effect: "Allow",
            Resource: { "Fn::GetAtt": ["functionB93D70A66", "Arn"] },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-sst-Bucket", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bucket]);

  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "s3:*",
            Effect: "Allow",
            Resource: [
              { "Fn::GetAtt": ["bucketBucketF19722A9", "Arn"] },
              {
                "Fn::Join": [
                  "",
                  [{ "Fn::GetAtt": ["bucketBucketF19722A9", "Arn"] }, "/*"],
                ],
              },
            ],
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-sst-EventBus", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "bus");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bus]);

  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "events:*",
            Effect: "Allow",
            Resource: { "Fn::GetAtt": ["busEventBus27CE599B", "Arn"] },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-cfn-construct-sns", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([topic]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "sns:*",
            Effect: "Allow",
            Resource: { Ref: "TopicBFC7AF6E" },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-cfn-construct-s3", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new s3.Bucket(stack, "Bucket");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bucket]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "s3:*",
            Effect: "Allow",
            Resource: [
              { "Fn::GetAtt": ["Bucket83908E77", "Arn"] },
              {
                "Fn::Join": [
                  "",
                  [{ "Fn::GetAtt": ["Bucket83908E77", "Arn"] }, "/*"],
                ],
              },
            ],
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-cfn-construct-table", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: {
      id: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "id" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([table]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "dynamodb:*",
            Effect: "Allow",
            Resource: [
              { "Fn::GetAtt": ["Table710B521B", "Arn"] },
              {
                "Fn::Join": [
                  "",
                  [{ "Fn::GetAtt": ["Table710B521B", "Arn"] }, "/*"],
                ],
              },
            ],
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-array-cfn-construct-not-supported", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new apig.HttpApi(stack, "Api");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    f.attachPermissions([api]);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermission-array-cfn-grant", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([[topic, "grantPublish"]]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          {
            Action: "sns:Publish",
            Effect: "Allow",
            Resource: { Ref: "TopicBFC7AF6E" },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermission-policy-statement", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([
    new iam.PolicyStatement({
      actions: ["s3:*"],
      resources: ["*"],
      effect: iam.Effect.ALLOW,
    }),
  ]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

/////////////////////////////
// Test mergeProps
/////////////////////////////

test("mergeProps", async () => {
  const baseProps = {
    timeout: 5,
    srcPath: "path",
  };
  const props = {
    timeout: 10,
  };
  const newProps = Function.mergeProps(baseProps, props);
  expect(newProps).toEqual({
    timeout: 10,
    srcPath: "path",
  });
});

test("mergeProps-environment", async () => {
  const baseProps = {
    environment: {
      keyA: "valueA",
      keyB: "valueB",
    },
  };
  const props = {
    environment: {
      keyB: "valueB2",
      keyC: "valueC",
    },
  };
  const newProps = Function.mergeProps(baseProps, props);
  expect(newProps).toEqual({
    environment: {
      keyA: "valueA",
      keyB: "valueB2",
      keyC: "valueC",
    },
  });
});

test("mergeProps-permissions", async () => {
  expect(
    Function.mergeProps(
      { permissions: PermissionType.ALL },
      { permissions: PermissionType.ALL }
    )
  ).toEqual({ permissions: PermissionType.ALL });

  expect(
    Function.mergeProps(
      { permissions: ["s3"] },
      { permissions: PermissionType.ALL }
    )
  ).toEqual({ permissions: PermissionType.ALL });

  expect(
    Function.mergeProps(
      { permissions: PermissionType.ALL },
      { permissions: ["s3"] }
    )
  ).toEqual({ permissions: PermissionType.ALL });

  expect(
    Function.mergeProps({ permissions: ["s3"] }, { permissions: ["dynamodb"] })
  ).toEqual({ permissions: ["s3", "dynamodb"] });
});

test("mergeProps-layers", async () => {
  const stack = new Stack(new App(), "stack");
  const layer1Arn = "arn:aws:lambda:us-east-1:123:layer:my-layer:1";
  const layer2Arn = "arn:aws:lambda:us-east-1:123:layer:my-layer:2";
  const layer1 = lambda.LayerVersion.fromLayerVersionArn(
    stack,
    "Layer1",
    layer1Arn
  );
  const layer2 = lambda.LayerVersion.fromLayerVersionArn(
    stack,
    "Layer2",
    layer2Arn
  );
  expect(
    Function.mergeProps({ layers: [layer1] }, { layers: [layer2] })
  ).toEqual({ layers: [layer1, layer2] });
});

test("mergeProps-bundle", async () => {
  // base props {}
  expect(Function.mergeProps({}, {})).toEqual({});

  expect(Function.mergeProps({}, { bundle: true })).toEqual({ bundle: true });

  expect(Function.mergeProps({}, { bundle: false })).toEqual({ bundle: false });

  expect(Function.mergeProps({}, { bundle: { nodeModules: [] } })).toEqual({
    bundle: { nodeModules: [] },
  });

  // base props { bundle: true }
  expect(Function.mergeProps({ bundle: true }, {})).toEqual({ bundle: true });

  expect(Function.mergeProps({ bundle: true }, { bundle: true })).toEqual({
    bundle: true,
  });

  expect(Function.mergeProps({ bundle: true }, { bundle: false })).toEqual({
    bundle: false,
  });

  expect(
    Function.mergeProps({ bundle: true }, { bundle: { nodeModules: [] } })
  ).toEqual({ bundle: { nodeModules: [] } });

  // base props { bundle: false }
  expect(Function.mergeProps({ bundle: false }, {})).toEqual({ bundle: false });

  expect(Function.mergeProps({ bundle: false }, { bundle: true })).toEqual({
    bundle: true,
  });

  expect(Function.mergeProps({ bundle: false }, { bundle: false })).toEqual({
    bundle: false,
  });

  expect(
    Function.mergeProps({ bundle: false }, { bundle: { nodeModules: [] } })
  ).toEqual({ bundle: { nodeModules: [] } });

  // base props { bundle: false }
  expect(Function.mergeProps({ bundle: { externalModules: [] } }, {})).toEqual({
    bundle: { externalModules: [] },
  });

  expect(
    Function.mergeProps({ bundle: { externalModules: [] } }, { bundle: true })
  ).toEqual({ bundle: true });

  expect(
    Function.mergeProps({ bundle: { externalModules: [] } }, { bundle: false })
  ).toEqual({ bundle: false });

  expect(
    Function.mergeProps(
      { bundle: { externalModules: [] } },
      { bundle: { nodeModules: [] } }
    )
  ).toEqual({ bundle: { nodeModules: [] } });
});

/////////////////////////////
// Test app defaultFunctionProps
/////////////////////////////

test("app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 15,
      MemorySize: 1024,
      TracingConfig: { Mode: "Active" },
    })
  );
});

test("app-defaultFunctionProps-calledTwice", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 256,
    environment: { keyA: "valueA" },
  });
  app.setDefaultFunctionProps({
    timeout: 10,
    environment: { keyB: "valueB" },
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 10,
      MemorySize: 256,
      Environment: {
        Variables: {
          keyA: "valueA",
          keyB: "valueB",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
      TracingConfig: { Mode: "Active" },
    })
  );
});

test("app-defaultFunctionProps-callback", async () => {
  const app = new App();
  app.setDefaultFunctionProps(() => ({
    timeout: 15,
  }));

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 15,
      MemorySize: 1024,
      TracingConfig: { Mode: "Active" },
    })
  );
});

test("app-defaultFunctionProps-callback-calledTwice", async () => {
  const app = new App();
  app.setDefaultFunctionProps(() => ({
    timeout: 15,
    memorySize: 256,
    environment: { keyA: "valueA" },
  }));
  app.setDefaultFunctionProps(() => ({
    timeout: 10,
    environment: { keyB: "valueB" },
  }));

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 10,
      MemorySize: 256,
      Environment: {
        Variables: {
          keyA: "valueA",
          keyB: "valueB",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
      TracingConfig: { Mode: "Active" },
    })
  );
});

test("app-defaultFunctionProps-override", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    environment: { keyA: "valueA" },
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 10,
    environment: { keyB: "valueB" },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 10,
      MemorySize: 1024,
      TracingConfig: { Mode: "Active" },
      Environment: {
        Variables: {
          keyA: "valueA",
          keyB: "valueB",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
});

/////////////////////////////
// Test fromDefinition
/////////////////////////////

test("fromDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 10,
    })
  );
});

test("fromDefinition-string-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048,
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 15,
      MemorySize: 2048,
    })
  );
});

test("fromDefinition-string-inherit", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20,
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 20,
    })
  );
});

test("fromDefinition-string-inherit-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048,
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20,
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 20,
      MemorySize: 2048,
    })
  );
});

test("fromDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("fromDefinition-props-inherit", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(
    stack,
    "Function",
    {
      handler: "test/lambda.handler",
      memorySize: 2048,
      environment: { KEY_A: "a" },
    },
    {
      runtime: lambda.Runtime.NODEJS_10_X,
      memorySize: 512,
      environment: { KEY_B: "b" },
    }
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Runtime: "nodejs10.x",
      MemorySize: 2048,
      Environment: {
        Variables: {
          KEY_A: "a",
          KEY_B: "b",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
});

test("fromDefinition-props-inherit-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 1024,
    environment: { KEY_A: "a" },
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(
    stack,
    "Function",
    {
      handler: "test/lambda.handler",
      memorySize: 2048,
      environment: { KEY_B: "b" },
    },
    {
      runtime: lambda.Runtime.NODEJS_10_X,
      memorySize: 512,
      environment: { KEY_C: "c" },
    }
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Runtime: "nodejs10.x",
      Timeout: 15,
      MemorySize: 2048,
      Environment: {
        Variables: {
          KEY_A: "a",
          KEY_B: "b",
          KEY_C: "c",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
});

test("fromDefinition-sstFunction", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(
    stack,
    "Function",
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      timeout: 20,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 20,
    })
  );
});

test("fromDefinition-sstFunction-inherit", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    Function.fromDefinition(
      stack,
      "Function",
      new Function(stack, "Function", {
        handler: "test/lambda.handler",
        timeout: 20,
      }),
      { timeout: 10 },
      "Cannot inherit"
    );
  }).toThrow(/Cannot inherit/);
});

test("fromDefinition-lambdaFunction", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    Function.fromDefinition(
      stack,
      "Function",
      new lambda.Function(stack, "Function", {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: "lambda.handler",
        code: lambda.Code.fromAsset("test"),
      }) as Function
    );
  }).toThrow(
    /Please use sst.Function instead of lambda.Function for the "Function" Function./
  );
});

test("fromDefinition-garbage", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    Function.fromDefinition(stack, "Function", {} as FunctionProps);
  }).toThrow(/Invalid function definition for the "Function" Function/);
});
