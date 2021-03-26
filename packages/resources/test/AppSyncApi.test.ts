import {
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
  objectLike,
} from "@aws-cdk/assert";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import * as appsync from "@aws-cdk/aws-appsync";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import { App, Stack, Table, TableFieldType, AppSyncApi } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("graphqlApi-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {});
  expectCdk(stack).to(
    haveResource("AWS::AppSync::GraphQLApi", {
      AuthenticationType: "API_KEY",
      Name: "dev-my-app-Api",
      XrayEnabled: true,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::AppSync::GraphQLSchema", {
      Definition: "",
    })
  );
  expectCdk(stack).to(countResources("AWS::AppSync::ApiKey", 1));
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 0));
  expectCdk(stack).to(countResources("AWS::AppSync::Resolver", 0));
});

test("graphqlApi-props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: {
      schema: appsync.Schema.fromAsset("test/schema.graphql"),
      xrayEnabled: false,
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::AppSync::GraphQLApi", {
      AuthenticationType: "API_KEY",
      Name: "dev-my-app-Api",
      XrayEnabled: false,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::AppSync::GraphQLSchema", {
      Definition: "# placeholder\n",
    })
  );
});

test("graphqlApi-props-schema-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: {
      schema: "test/schema.graphql",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::AppSync::GraphQLSchema", {
      Definition: "# placeholder\n",
    })
  );
});

test("graphqlApi-construct", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: new appsync.GraphqlApi(stack, "GraphqlApi", {
      name: "existing-api",
    }),
  });
  expectCdk(stack).to(
    haveResource("AWS::AppSync::GraphQLApi", {
      Name: "existing-api",
    })
  );
});

test("dataSources-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api");
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 0));
});

test("dataSources-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {},
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 0));
});

test("dataSources-FunctionDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "lambdaDS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("dataSources-FunctionDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        handler: "test/lambda.handler",
        timeout: 3,
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "lambdaDS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("dataSources-FunctionDefinition-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "lambdaDS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("dataSources-LambdaDataSource-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "lambdaDS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("dataSources-LambdaDataSource-props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: {
          handler: "test/lambda.handler",
          timeout: 3,
        },
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "lambdaDS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("dataSources-LambdaDataSource-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "lambdaDS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("dataSources-LambdaDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
        options: {
          name: "My Lambda DS",
        },
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "My Lambda DS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("dataSources-DynamoDbDataSource-sstTable", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: { id: TableFieldType.STRING },
    primaryIndex: { partitionKey: "id" },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: { table },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "dbDS",
      Type: "AMAZON_DYNAMODB",
    })
  );
  expectCdk(stack).to(countResources("AWS::DynamoDB::Table", 1));
});

test("dataSources-DynamoDbDataSource-dynamodbTable", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new dynamodb.Table(stack, "Table", {
    partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: { table },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "dbDS",
      Type: "AMAZON_DYNAMODB",
    })
  );
  expectCdk(stack).to(countResources("AWS::DynamoDB::Table", 1));
});

test("dataSources-DynamoDbDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: { id: TableFieldType.STRING },
    primaryIndex: { partitionKey: "id" },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: {
        table,
        options: {
          name: "My DB DS",
        },
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "My DB DS",
      Type: "AMAZON_DYNAMODB",
    })
  );
  expectCdk(stack).to(countResources("AWS::DynamoDB::Table", 1));
});

test("dataSources-RdsDataSource", async () => {
  const stack = new Stack(new App(), "stack");
  const cluster = new rds.ServerlessCluster(stack, "Database", {
    engine: rds.DatabaseClusterEngine.auroraMysql({
      version: rds.AuroraMysqlEngineVersion.VER_2_08_1,
    }),
    vpc: new ec2.Vpc(stack, "VPC"),
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      rdsDS: {
        serverlessCluster: cluster,
        secretStore: cluster.secret as secretsmanager.ISecret,
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "rdsDS",
      Type: "RELATIONAL_DATABASE",
      RelationalDatabaseConfig: objectLike({
        RelationalDatabaseSourceType: "RDS_HTTP_ENDPOINT",
      }),
    })
  );
  expectCdk(stack).to(countResources("AWS::RDS::DBCluster", 1));
});

test("dataSources-RdsDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  const cluster = new rds.ServerlessCluster(stack, "Database", {
    engine: rds.DatabaseClusterEngine.auroraMysql({
      version: rds.AuroraMysqlEngineVersion.VER_2_08_1,
    }),
    vpc: new ec2.Vpc(stack, "VPC"),
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      rdsDS: {
        serverlessCluster: cluster,
        secretStore: cluster.secret as secretsmanager.ISecret,
        options: {
          name: "My RDS DS",
        },
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "My RDS DS",
      Type: "RELATIONAL_DATABASE",
      RelationalDatabaseConfig: objectLike({
        RelationalDatabaseSourceType: "RDS_HTTP_ENDPOINT",
      }),
    })
  );
  expectCdk(stack).to(countResources("AWS::RDS::DBCluster", 1));
});

test("dataSources-HttpDataSource", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      httpDS: {
        endpoint: "https://google.com",
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "httpDS",
      Type: "HTTP",
      HttpConfig: {
        Endpoint: "https://google.com",
      },
    })
  );
});

test("dataSources-HttpDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      httpDS: {
        endpoint: "https://google.com",
        options: {
          name: "My HTTP DS",
        },
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "My HTTP DS",
      Type: "HTTP",
      HttpConfig: {
        Endpoint: "https://google.com",
      },
    })
  );
});

test("resolvers-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api");
  expectCdk(stack).to(countResources("AWS::AppSync::Resolver", 0));
});

test("resolvers-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {},
  });
  expectCdk(stack).to(countResources("AWS::AppSync::Resolver", 0));
});

test("resolvers-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "GET / 1 2 3": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid resolver Get \/ 1 2 3/);
});

test("resolvers-invalid-field", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "GET ": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid field defined for "Get "/);
});

test("resolvers-datasource-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    resolvers: {
      "Query notes": "lambdaDS",
      "Mutation notes": "lambdaDS",
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(countResources("AWS::AppSync::Resolver", 2));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::Resolver", {
      FieldName: "notes",
      TypeName: "Query",
      DataSourceName: "lambdaDS",
      Kind: "UNIT",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::AppSync::Resolver", {
      FieldName: "notes",
      TypeName: "Mutation",
      DataSourceName: "lambdaDS",
      Kind: "UNIT",
    })
  );
});

test("resolvers-datasource-not-exist-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "Query notes": "lambdaDS",
      },
    });
  }).toThrow(/Failed to create resolver/);
});

test("resolvers-FunctionDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Mutation notes": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 2, {
      Handler: "lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 2));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "LambdaDS_Query_notes",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "LambdaDS_Mutation_notes",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(countResources("AWS::AppSync::Resolver", 2));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::Resolver", {
      FieldName: "notes",
      TypeName: "Query",
      DataSourceName: "LambdaDS_Query_notes",
      Kind: "UNIT",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::AppSync::Resolver", {
      FieldName: "notes",
      TypeName: "Mutation",
      DataSourceName: "LambdaDS_Mutation_notes",
      Kind: "UNIT",
    })
  );
});

test("resolvers-FunctionDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": {
        handler: "test/lambda.handler",
      },
      "Mutation notes": {
        handler: "test/lambda.handler",
      },
    },
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 2, {
      Handler: "lambda.handler",
    })
  );
});

test("resolvers-FunctionDefinition-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Mutation notes": "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 2, {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("resolvers-ResolverProps-with-datasource-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    resolvers: {
      "Query notes": {
        dataSource: "lambdaDS",
        resolverProps: {
          requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
          responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
        },
      },
    },
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 1, {
      Handler: "lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "lambdaDS",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(countResources("AWS::AppSync::Resolver", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::Resolver", {
      FieldName: "notes",
      TypeName: "Query",
      DataSourceName: "lambdaDS",
      Kind: "UNIT",
      RequestMappingTemplate:
        '{"version" : "2017-02-28", "operation" : "Scan"}',
      ResponseMappingTemplate: "$util.toJson($ctx.result.items)",
    })
  );
});

test("resolvers-ResolverProps-with-FunctionDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": {
        function: "test/lambda.handler",
        resolverProps: {
          requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
          responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
        },
      },
    },
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 1, {
      Handler: "lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::AppSync::DataSource", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::DataSource", {
      Name: "LambdaDS_Query_notes",
      Type: "AWS_LAMBDA",
    })
  );
  expectCdk(stack).to(countResources("AWS::AppSync::Resolver", 1));
  expectCdk(stack).to(
    haveResource("AWS::AppSync::Resolver", {
      FieldName: "notes",
      TypeName: "Query",
      DataSourceName: "LambdaDS_Query_notes",
      Kind: "UNIT",
      RequestMappingTemplate:
        '{"version" : "2017-02-28", "operation" : "Scan"}',
      ResponseMappingTemplate: "$util.toJson($ctx.result.items)",
    })
  );
});

///////////////////
// Test Methods
///////////////////

test("getDataSource-datasource-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDs: "test/lambda.handler",
    },
  });
  expect(api.getDataSource("lambdaDs")).toBeDefined();
  expect(api.getDataSource("lambdaDs2")).toBeUndefined();
});

test("getDataSource-resolver-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
    },
  });
  expect(api.getDataSource("Query notes")).toBeDefined();
  expect(api.getDataSource("Query  notes")).toBeDefined();
  expect(api.getDataSource("Query notes2")).toBeUndefined();
});

test("getFunction-dataSource-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDs: "test/lambda.handler",
    },
  });
  expect(api.getFunction("lambdaDs")).toBeDefined();
  expect(api.getFunction("lambdaDs2")).toBeUndefined();
});

test("getFunction-resolver-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
    },
  });
  expect(api.getFunction("Query notes")).toBeDefined();
  expect(api.getFunction("Query  notes")).toBeDefined();
  expect(api.getFunction("Query notes2")).toBeUndefined();
});

test("getResolver", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
    },
  });
  expect(api.getResolver("Query notes")).toBeDefined();
  expect(api.getResolver("Query  notes")).toBeDefined();
  expect(api.getResolver("Query notes2")).toBeUndefined();
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Query notes2": "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  expectCdk(stack).to(
    countResourcesLike("AWS::IAM::Policy", 2, {
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

test("attachPermissionsToDataSource-dataSource-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
      lambdaDS2: "test/lambda.handler",
    },
  });
  api.attachPermissionsToDataSource("lambdaDS", ["s3"]);
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
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [lambdaDefaultPolicy],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermissionsToDataSource-resolver-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Query notes2": "test/lambda.handler",
    },
  });
  api.attachPermissionsToDataSource("Query notes", ["s3"]);
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
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [lambdaDefaultPolicy],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermissions-after-addResolvers", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const api = new AppSyncApi(stackA, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Query notes2": "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  api.addResolvers(stackB, {
    "Query notes3": "test/lambda.handler",
  });
  expectCdk(stackA).to(
    countResourcesLike("AWS::IAM::Policy", 2, {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
  expectCdk(stackB).to(
    countResourcesLike("AWS::IAM::Policy", 1, {
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
