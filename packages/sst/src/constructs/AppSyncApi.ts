import path from "path";
import fs from "fs";

export async function weakImport(pkg: string) {
  try {
    return await import(pkg);
  } catch {
    return {};
  }
}

const { print } = await weakImport("graphql");
const { mergeTypeDefs } = await weakImport("@graphql-tools/merge");

import { Construct } from "constructs";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Table } from "./Table.js";
import { RDS } from "./RDS.js";
import * as appSyncApiDomain from "./util/appSyncApiDomain.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { FunctionBindingProps } from "./util/functionBinding.js";
import { Permissions } from "./util/permission.js";
import { useProject } from "../project.js";
import { Table as CDKTable } from "aws-cdk-lib/aws-dynamodb";
import { IServerlessCluster } from "aws-cdk-lib/aws-rds";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import {
  AwsIamConfig,
  BaseDataSource,
  CfnDomainName,
  CfnDomainNameApiAssociation,
  GraphqlApi,
  GraphqlApiProps,
  IGraphqlApi,
  MappingTemplate as CDKMappingTemplate,
  Resolver,
  ResolverProps,
  SchemaFile,
  Definition,
  LambdaDataSource,
  DynamoDbDataSource,
  RdsDataSource,
  OpenSearchDataSource,
  HttpDataSource,
  NoneDataSource,
} from "aws-cdk-lib/aws-appsync";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { IDomain } from "aws-cdk-lib/aws-opensearchservice";

/////////////////////
// Interfaces
/////////////////////

export interface AppSyncApiDomainProps
  extends appSyncApiDomain.CustomDomainProps {}

interface AppSyncApiBaseDataSourceProps {
  /**
   * Name of the data source
   */
  name?: string;
  /**
   * Description of the data source
   */
  description?: string;
}

/**
 * Used to define a lambda data source
 *
 * @example
 * ```js
 * new AppSyncApi(stack, "AppSync", {
 *   dataSources: {
 *     lambda: {
 *       type: "function",
 *       function: "src/function.handler"
 *     },
 *   },
 * });
 * ```
 *
 */
export interface AppSyncApiLambdaDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  /**
   * String literal to signify that this data source is a function
   */
  type?: "function";
  /**
   * Function definition
   */
  function: FunctionDefinition;
}

/**
 * Used to define a DynamoDB data source
 *
 * @example
 * ```js
 * new AppSyncApi(stack, "AppSync", {
 *   dataSources: {
 *     table: {
 *       type: "table",
 *       table: MyTable
 *     },
 *   },
 * });
 * ```
 */
export interface AppSyncApiDynamoDbDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  /**
   * String literal to signify that this data source is a dynamodb table
   */
  type: "dynamodb";
  /**
   * Target table
   */
  table?: Table;
  cdk?: {
    dataSource?: {
      table: CDKTable;
    };
  };
}

/**
 * Used to define a RDS data source
 *
 * @example
 * ```js
 * new AppSyncApi(stack, "AppSync", {
 *   dataSources: {
 *     rds: {
 *       type: "rds",
 *       rds: myRDSCluster
 *     },
 *   },
 * });
 * ```
 */
export interface AppSyncApiRdsDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  /**
   * String literal to signify that this data source is an RDS database
   */
  type: "rds";
  /**
   * Target RDS construct
   */
  rds?: RDS;
  /**
   * The name of the database to connect to
   */
  databaseName?: string;
  cdk?: {
    dataSource?: {
      serverlessCluster: IServerlessCluster;
      secretStore: ISecret;
      databaseName?: string;
    };
  };
}

/**
 * Used to define a OpenSearch data source
 *
 * @example
 * ```js
 * new AppSyncApi(stack, "AppSync", {
 *   dataSources: {
 *     search: {
 *       type: "open_search",
 *       cdk: {
 *         dataSource: {
 *           domain: myOpenSearchDomain,
 *         }
 *       }
 *     }
 *   }
 * });
 * ```
 */
export interface AppSyncApiOpenSearchDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  /**
   * String literal to signify that this data source is an OpenSearch domain
   */
  type: "open_search";
  cdk: {
    dataSource: {
      domain: IDomain;
    };
  };
}

/**
 * Used to define an http data source
 *
 * @example
 * ```js
 * new AppSyncApi(stack, "AppSync", {
 *   dataSources: {
 *     http: {
 *       type: "http",
 *       endpoint: "https://example.com"
 *     },
 *   },
 * });
 * ```
 */
export interface AppSyncApiHttpDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  /**
   * String literal to signify that this data source is an HTTP endpoint
   */
  type: "http";
  /**
   * URL to forward requests to
   */
  endpoint: string;
  cdk?: {
    dataSource?: {
      authorizationConfig?: AwsIamConfig;
    };
  };
}

/**
 * Used to define a none data source
 *
 * @example
 * ```js
 * new AppSyncApi(stack, "AppSync", {
 *   dataSources: {
 *     none: {
 *       type: "none",
 *     },
 *   },
 * });
 * ```
 */
export interface AppSyncApiNoneDataSourceProps
  extends AppSyncApiBaseDataSourceProps {
  /**
   * String literal to signify that this data source is an HTTP endpoint
   */
  type: "none";
}

export interface MappingTemplateFile {
  /**
   * Path to the file containing the VTL mapping template
   */
  file: string;
}
export interface MappingTemplateInline {
  /**
   * Inline definition of the VTL mapping template
   */
  inline: string;
}

export type MappingTemplate = MappingTemplateFile | MappingTemplateInline;

/**
 * Used to define full resolver config
 */
export interface AppSyncApiResolverProps {
  /**
   * The data source for this resolver. The data source must be already created.
   */
  dataSource?: string;
  /**
   * The function definition used to create the data source for this resolver.
   */
  function?: FunctionDefinition;
  /**
   * VTL request mapping template
   *
   * @example
   * ```js
   *   requestMapping: {
   *     inline: '{"version" : "2017-02-28", "operation" : "Scan"}',
   *   },
   * ```
   *
   * @example
   * ```js
   *   requestMapping: {
   *     file: "path/to/template.vtl",
   *   },
   * ```
   */
  requestMapping?: MappingTemplate;
  /**
   * VTL response mapping template
   *
   * @example
   * ```js
   *   responseMapping: {
   *     inline: "$util.toJson($ctx.result.items)",
   *   },
   * ```
   *
   * @example
   * ```js
   *   responseMapping: {
   *     file: "path/to/template.vtl",
   *   },
   * ```
   */
  responseMapping?: MappingTemplate;
  cdk?: {
    /**
     * This allows you to override the default settings this construct uses internally to create the resolver.
     */
    resolver: Omit<
      ResolverProps,
      "api" | "fieldName" | "typeName" | "dataSource"
    >;
  };
}

export interface AppSyncApiProps {
  /**
   * The GraphQL schema definition.
   *
   * @example
   *
   * ```js
   * new AppSyncApi(stack, "GraphqlApi", {
   *   schema: "graphql/schema.graphql",
   * });
   * ```
   */
  schema?: string | string[];
  /**
   * Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)
   *
   * @example
   * ```js
   * new AppSyncApi(stack, "GraphqlApi", {
   *   customDomain: "api.example.com"
   * })
   * ```
   *
   * @example
   * ```js
   * new AppSyncApi(stack, "GraphqlApi", {
   *   customDomain: {
   *     domainName: "api.example.com",
   *     hostedZone: "domain.com",
   *   }
   * })
   * ```
   */
  customDomain?: string | AppSyncApiDomainProps;
  /**
   * Define datasources. Can be a function, dynamodb table, rds cluster or http endpoint
   *
   * @example
   * ```js
   * new AppSyncApi(stack, "GraphqlApi", {
   *   dataSources: {
   *     notes: "src/notes.main",
   *   },
   *   resolvers: {
   *     "Query    listNotes": "notes",
   *   },
   * });
   * ```
   */
  dataSources?: Record<
    string,
    | FunctionInlineDefinition
    | AppSyncApiLambdaDataSourceProps
    | AppSyncApiDynamoDbDataSourceProps
    | AppSyncApiRdsDataSourceProps
    | AppSyncApiOpenSearchDataSourceProps
    | AppSyncApiHttpDataSourceProps
    | AppSyncApiNoneDataSourceProps
  >;
  /**
   * The resolvers for this API. Takes an object, with the key being the type name and field name as a string and the value is either a string with the name of existing data source.
   *
   * @example
   * ```js
   * new AppSyncApi(stack, "GraphqlApi", {
   *   resolvers: {
   *     "Query    listNotes": "src/list.main",
   *     "Query    getNoteById": "src/get.main",
   *     "Mutation createNote": "src/create.main",
   *     "Mutation updateNote": "src/update.main",
   *     "Mutation deleteNote": "src/delete.main",
   *   },
   * });
   * ```
   */
  resolvers?: Record<
    string,
    string | FunctionInlineDefinition | AppSyncApiResolverProps
  >;
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the AppSyncApi. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     * ```js
     * new AppSync(stack, "AppSync", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { tableName: table.tableName },
     *       permissions: [table],
     *     }
     *   },
     * });
     * ```
     */
    function?: FunctionProps;
  };
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * Allows you to override default settings this construct uses internally to create the AppSync API.
     */
    graphqlApi?: IGraphqlApi | AppSyncApiCdkGraphqlProps;
  };
}

export interface AppSyncApiCdkGraphqlProps
  extends Omit<GraphqlApiProps, "name" | "schema"> {
  name?: string;
}

/////////////////////
// Construct
/////////////////////

/**
 *
 * The `AppSyncApi` construct is a higher level CDK construct that makes it easy to create an AppSync GraphQL API.
 *
 * @example
 *
 * ```js
 * import { AppSyncApi } from "sst/constructs";
 *
 * new AppSyncApi(stack, "GraphqlApi", {
 *   schema: "graphql/schema.graphql",
 *   dataSources: {
 *     notesDS: "src/notes.main",
 *   },
 *   resolvers: {
 *     "Query    listNotes": "notesDS",
 *     "Query    getNoteById": "notesDS",
 *     "Mutation createNote": "notesDS",
 *     "Mutation updateNote": "notesDS",
 *     "Mutation deleteNote": "notesDS",
 *   },
 * });
 * ```
 */
export class AppSyncApi extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly cdk: {
    /**
     * The internally created appsync api
     */
    graphqlApi: GraphqlApi;
    /**
     * If custom domain is enabled, this is the internally created CDK Certificate instance.
     */
    certificate?: ICertificate;
  };
  private readonly props: AppSyncApiProps;
  private _customDomainUrl?: string;
  private readonly functionsByDsKey: { [key: string]: Fn } = {};
  private readonly dataSourcesByDsKey: {
    [key: string]: BaseDataSource;
  } = {};
  private readonly dsKeysByResKey: { [key: string]: string } = {};
  private readonly resolversByResKey: { [key: string]: Resolver } = {};
  private readonly bindingForAllFunctions: SSTConstruct[] = [];
  private readonly permissionsAttachedForAllFunctions: Permissions[] = [];

  constructor(scope: Construct, id: string, props: AppSyncApiProps) {
    super(scope, props?.cdk?.id || id);

    this.id = id;
    this.props = props;
    this.cdk = {} as any;

    this.createGraphApi();

    // Configure data sources
    if (props?.dataSources) {
      for (const key of Object.keys(props.dataSources)) {
        this.addDataSource(this, key, props.dataSources[key]);
      }
    }

    // Configure resolvers
    if (props?.resolvers) {
      for (const key of Object.keys(props.resolvers)) {
        this.addResolver(this, key, props.resolvers[key]);
      }
    }

    const app = this.node.root as App;
    app.registerTypes(this);
  }

  /**
   * The Id of the internally created AppSync GraphQL API.
   */
  public get apiId(): string {
    return this.cdk.graphqlApi.apiId;
  }

  /**
   * The ARN of the internally created AppSync GraphQL API.
   */
  public get apiArn(): string {
    return this.cdk.graphqlApi.arn;
  }

  /**
   * The name of the internally created AppSync GraphQL API.
   */
  public get apiName(): string {
    return this.cdk.graphqlApi.name;
  }

  /**
   * The AWS generated URL of the Api.
   */
  public get url(): string {
    return this.cdk.graphqlApi.graphqlUrl;
  }

  /**
   * If custom domain is enabled, this is the custom domain URL of the Api.
   */
  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  /**
   * Add data sources after the construct has been created
   *
   * @example
   * ```js
   * api.addDataSources(stack, {
   *   billingDS: "src/billing.main",
   * });
   * ```
   */
  public addDataSources(
    scope: Construct,
    dataSources: {
      [key: string]:
        | FunctionInlineDefinition
        | AppSyncApiLambdaDataSourceProps
        | AppSyncApiDynamoDbDataSourceProps
        | AppSyncApiRdsDataSourceProps
        | AppSyncApiOpenSearchDataSourceProps
        | AppSyncApiHttpDataSourceProps
        | AppSyncApiNoneDataSourceProps;
    }
  ): void {
    Object.keys(dataSources).forEach((key: string) => {
      this.addDataSource(scope, key, dataSources[key]);
    });
  }

  /**
   * Add resolvers the construct has been created
   *
   * @example
   * ```js
   * api.addResolvers(stack, {
   *   "Mutation charge": "billingDS",
   * });
   * ```
   */
  public addResolvers(
    scope: Construct,
    resolvers: {
      [key: string]: FunctionInlineDefinition | AppSyncApiResolverProps;
    }
  ): void {
    Object.keys(resolvers).forEach((key: string) => {
      this.addResolver(scope, key, resolvers[key]);
    });
  }

  /**
   * Get the instance of the internally created Function, for a given resolver.
   *
   * @example
   * ```js
   * const func = api.getFunction("Mutation charge");
   * ```
   */
  public getFunction(key: string): Fn | undefined {
    let fn = this.functionsByDsKey[key];

    if (!fn) {
      const resKey = this.normalizeResolverKey(key);
      const dsKey = this.dsKeysByResKey[resKey];
      fn = this.functionsByDsKey[dsKey];
    }
    return fn;
  }

  /**
   * Get a datasource by name
   * @example
   * ```js
   * api.getDataSource("billingDS");
   * ```
   */
  public getDataSource(key: string): BaseDataSource | undefined {
    let ds = this.dataSourcesByDsKey[key];

    if (!ds) {
      const resKey = this.normalizeResolverKey(key);
      const dsKey = this.dsKeysByResKey[resKey];
      ds = this.dataSourcesByDsKey[dsKey];
    }
    return ds;
  }

  /**
   * Get a resolver
   *
   * @example
   * ```js
   * api.getResolver("Mutation charge");
   * ```
   */
  public getResolver(key: string): Resolver | undefined {
    const resKey = this.normalizeResolverKey(key);
    return this.resolversByResKey[resKey];
  }

  /**
   * Binds the given list of resources to all function data sources.
   *
   * @example
   *
   * ```js
   * api.bind([STRIPE_KEY, bucket]);
   * ```
   */
  public bind(constructs: SSTConstruct[]) {
    Object.values(this.functionsByDsKey).forEach((fn) => fn.bind(constructs));
    this.bindingForAllFunctions.push(...constructs);
  }

  /**
   * Binds the given list of resources to a specific function data source.
   *
   * @example
   * ```js
   * api.bindToDataSource("Mutation charge", [STRIPE_KEY, bucket]);
   * ```
   *
   */
  public bindToDataSource(key: string, constructs: SSTConstruct[]): void {
    const fn = this.getFunction(key);
    if (!fn) {
      throw new Error(
        `Failed to bind resources. Function does not exist for key "${key}".`
      );
    }

    fn.bind(constructs);
  }

  /**
   * Attaches the given list of permissions to all function data sources
   *
   * @example
   * ```js
   * api.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functionsByDsKey).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllFunctions.push(permissions);
  }

  /**
   * Attaches the given list of permissions to a specific function datasource. This allows that function to access other AWS resources.
   *
   * @example
   * ```js
   * api.attachPermissionsToDataSource("Mutation charge", ["s3"]);
   * ```
   */
  public attachPermissionsToDataSource(
    key: string,
    permissions: Permissions
  ): void {
    const fn = this.getFunction(key);
    if (!fn) {
      throw new Error(
        `Failed to attach permissions. Function does not exist for key "${key}".`
      );
    }

    fn.attachPermissions(permissions);
  }

  public getConstructMetadata() {
    return {
      type: "AppSync" as const,
      data: {
        url: this.cdk.graphqlApi.graphqlUrl,
        appSyncApiId: this.cdk.graphqlApi.apiId,
        appSyncApiKey: this.cdk.graphqlApi.apiKey,
        customDomainUrl: this._customDomainUrl,
        dataSources: Object.entries(this.dataSourcesByDsKey).map(([key]) => ({
          name: key,
          fn: getFunctionRef(this.functionsByDsKey[key]),
        })),
      },
    };
  }

  /** @internal */
  public getFunctionBinding() {
    // Do not bind imported AppSync APIs b/c we don't know the API URL
    if (!this.url) {
      return;
    }

    return {
      clientPackage: "api",
      variables: {
        url: {
          type: "plain",
          value: this.customDomainUrl || this.url,
        },
      },
      permissions: {},
    } as FunctionBindingProps;
  }

  private createGraphApi() {
    const { schema, customDomain, cdk } = this.props;
    const id = this.node.id;
    const app = this.node.root as App;

    if (isCDKConstruct(cdk?.graphqlApi)) {
      if (customDomain !== undefined) {
        throw new Error(
          `Cannot configure the "customDomain" when "graphqlApi" is a construct`
        );
      }
      this.cdk.graphqlApi = cdk?.graphqlApi as GraphqlApi;
    } else {
      const graphqlApiProps = (cdk?.graphqlApi ||
        {}) as AppSyncApiCdkGraphqlProps;

      // build schema
      let mainSchema: SchemaFile;
      if (!schema) {
        throw new Error(`Missing "schema" in "${id}" AppSyncApi`);
      } else if (typeof schema === "string") {
        mainSchema = SchemaFile.fromAsset(schema);
      } else {
        if (schema.length === 0) {
          throw new Error(
            "Invalid schema. At least one schema file must be provided"
          );
        }
        // merge schema files
        const mergedSchema = mergeTypeDefs(
          schema.map((file) => fs.readFileSync(file).toString())
        );
        const filePath = path.join(
          useProject().paths.out,
          `appsyncapi-${id}-${this.node.addr}.graphql`
        );
        fs.writeFileSync(filePath, print(mergedSchema));
        mainSchema = SchemaFile.fromAsset(filePath);
      }

      // build domain
      const domainData = appSyncApiDomain.buildCustomDomainData(
        this,
        customDomain
      );
      this._customDomainUrl =
        domainData && `https://${domainData.domainName}/graphql`;

      this.cdk.graphqlApi = new GraphqlApi(this, "Api", {
        name: app.logicalPrefixedName(id),
        xrayEnabled: true,
        definition: Definition.fromSchema(mainSchema),
        domainName: domainData && {
          certificate: domainData.certificate,
          domainName: domainData.domainName,
        },
        ...graphqlApiProps,
      });
      this.cdk.certificate = domainData?.certificate;

      if (domainData) {
        appSyncApiDomain.cleanup(this, domainData);
      }
    }
  }

  private addDataSource(
    scope: Construct,
    dsKey: string,
    dsValue:
      | FunctionInlineDefinition
      | AppSyncApiLambdaDataSourceProps
      | AppSyncApiDynamoDbDataSourceProps
      | AppSyncApiRdsDataSourceProps
      | AppSyncApiOpenSearchDataSourceProps
      | AppSyncApiHttpDataSourceProps
      | AppSyncApiNoneDataSourceProps
  ) {
    let dataSource;
    let lambda: Fn | undefined;

    // Lambda function
    if (Fn.isInlineDefinition(dsValue)) {
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${dsKey}`,
        dsValue,
        this.props.defaults?.function,
        `Cannot define defaults.function when a Function is passed in to the "${dsKey} data source`
      );
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addLambdaDataSource(dsKey, lambda)
        : new LambdaDataSource(scope, dsKey, {
            api: this.cdk.graphqlApi,
            lambdaFunction: lambda,
          });
    }
    // DynamoDb ds
    else if (dsValue.type === "dynamodb") {
      const dsTable = dsValue.table
        ? dsValue.table.cdk.table
        : dsValue.cdk?.dataSource?.table!;
      const dsOptions = {
        name: dsValue.name,
        description: dsValue.description,
      };
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addDynamoDbDataSource(dsKey, dsTable, dsOptions)
        : new DynamoDbDataSource(scope, dsKey, {
            api: this.cdk.graphqlApi,
            table: dsTable,
            ...dsOptions,
          });
    }
    // RDS ds
    else if (dsValue.type === "rds") {
      const dsCluster = dsValue.rds
        ? dsValue.rds.cdk.cluster
        : dsValue.cdk?.dataSource?.serverlessCluster!;
      const dsSecret = dsValue.rds
        ? dsValue.rds.cdk.cluster.secret!
        : dsValue.cdk?.dataSource?.secretStore!;
      const dsDatabaseName = dsValue.rds
        ? dsValue.databaseName || dsValue.rds.defaultDatabaseName
        : dsValue.cdk?.dataSource?.databaseName;
      const dsOptions = {
        name: dsValue.name,
        description: dsValue.description,
      };
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addRdsDataSource(
            dsKey,
            dsCluster,
            dsSecret,
            dsDatabaseName,
            dsOptions
          )
        : new RdsDataSource(scope, dsKey, {
            api: this.cdk.graphqlApi,
            serverlessCluster: dsCluster,
            secretStore: dsSecret,
            databaseName: dsDatabaseName,
            ...dsOptions,
          });
    }
    // OpenSearch ds
    else if (dsValue.type === "open_search") {
      const dsOptions = {
        name: dsValue.name,
        description: dsValue.description,
      };
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addOpenSearchDataSource(
            dsKey,
            dsValue.cdk?.dataSource?.domain!,
            dsOptions
          )
        : new OpenSearchDataSource(scope, dsKey, {
            api: this.cdk.graphqlApi,
            domain: dsValue.cdk?.dataSource?.domain!,
            ...dsOptions,
          });
    }
    // Http ds
    else if (dsValue.type === "http") {
      const dsOptions = {
        name: dsValue.name,
        description: dsValue.description,
      };
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addHttpDataSource(
            dsKey,
            dsValue.endpoint,
            dsOptions
          )
        : new HttpDataSource(scope, dsKey, {
            api: this.cdk.graphqlApi,
            endpoint: dsValue.endpoint,
            ...dsOptions,
          });
    }
    // Http ds
    else if (dsValue.type === "none") {
      const dsOptions = {
        name: dsValue.name,
        description: dsValue.description,
      };
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addNoneDataSource(dsKey, dsOptions)
        : new NoneDataSource(scope, dsKey, {
            api: this.cdk.graphqlApi,
            ...dsOptions,
          });
    }
    // Lambda ds
    else {
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${dsKey}`,
        dsValue.function,
        this.props.defaults?.function,
        `Cannot define defaults.function when a Function is passed in to the "${dsKey} data source`
      );
      const dsOptions = {
        name: dsValue.name,
        description: dsValue.description,
      };
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addLambdaDataSource(dsKey, lambda, dsOptions)
        : new LambdaDataSource(scope, dsKey, {
            api: this.cdk.graphqlApi,
            lambdaFunction: lambda,
            ...dsOptions,
          });
    }
    this.dataSourcesByDsKey[dsKey] = dataSource;

    if (lambda) {
      this.functionsByDsKey[dsKey] = lambda;

      // attached existing permissions
      this.permissionsAttachedForAllFunctions.forEach((permissions) =>
        lambda!.attachPermissions(permissions)
      );
      lambda.bind(this.bindingForAllFunctions);
    }
  }

  private addResolver(
    scope: Construct,
    resKey: string,
    resValue: FunctionInlineDefinition | AppSyncApiResolverProps
  ): Fn | undefined {
    // Normalize resKey
    resKey = this.normalizeResolverKey(resKey);

    // Get type and field
    const resolverKeyParts = resKey.split(" ");
    if (resolverKeyParts.length !== 2) {
      throw new Error(`Invalid resolver ${resKey}`);
    }
    const [typeName, fieldName] = resolverKeyParts;
    if (fieldName.length === 0) {
      throw new Error(`Invalid field defined for "${resKey}"`);
    }

    ///////////////////
    // Create data source if not created before
    ///////////////////
    let lambda: Fn | undefined;
    let dataSource;
    let dataSourceKey;
    let resolverProps;

    // DataSource key
    if (
      typeof resValue === "string" &&
      Object.keys(this.dataSourcesByDsKey).includes(resValue)
    ) {
      dataSourceKey = resValue;
      dataSource = this.dataSourcesByDsKey[resValue];
      resolverProps = {};
    }
    // DataSource key not exist (string does not have a dot, assume it is referencing a data store)
    else if (typeof resValue === "string" && resValue.indexOf(".") === -1) {
      throw new Error(
        `Failed to create resolver "${resKey}". Data source "${resValue}" does not exist.`
      );
    }
    // Lambda resolver
    else if (this.isLambdaResolverProps(resValue as AppSyncApiResolverProps)) {
      resValue = resValue as AppSyncApiResolverProps;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${typeName}_${fieldName}`,
        resValue.function as FunctionDefinition,
        this.props.defaults?.function,
        `Cannot define defaults.function when a Function is passed in to the "${resKey} resolver`
      );
      dataSourceKey = this.buildDataSourceKey(typeName, fieldName);
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addLambdaDataSource(dataSourceKey, lambda)
        : new LambdaDataSource(scope, dataSourceKey, {
            api: this.cdk.graphqlApi,
            lambdaFunction: lambda,
          });
      resolverProps = {
        requestMappingTemplate: this.buildMappingTemplate(
          resValue.requestMapping
        ),
        responseMappingTemplate: this.buildMappingTemplate(
          resValue.responseMapping
        ),
        ...resValue.cdk?.resolver,
      };
    }
    // DataSource resolver
    else if (
      this.isDataSourceResolverProps(resValue as AppSyncApiResolverProps)
    ) {
      resValue = resValue as AppSyncApiResolverProps;
      dataSourceKey = resValue.dataSource as string;
      dataSource = this.dataSourcesByDsKey[dataSourceKey];
      resolverProps = {
        requestMappingTemplate: this.buildMappingTemplate(
          resValue.requestMapping
        ),
        responseMappingTemplate: this.buildMappingTemplate(
          resValue.responseMapping
        ),
        ...resValue.cdk?.resolver,
      };
    }
    // Lambda function
    else {
      resValue = resValue as FunctionInlineDefinition;
      lambda = Fn.fromDefinition(
        scope,
        `Lambda_${typeName}_${fieldName}`,
        resValue,
        this.props.defaults?.function,
        `Cannot define defaults.function when a Function is passed in to the "${resKey} resolver`
      );
      dataSourceKey = this.buildDataSourceKey(typeName, fieldName);
      dataSource = this.isSameStack(scope)
        ? this.cdk.graphqlApi.addLambdaDataSource(dataSourceKey, lambda)
        : new LambdaDataSource(scope, dataSourceKey, {
            api: this.cdk.graphqlApi,
            lambdaFunction: lambda,
          });
      resolverProps = {};
    }

    if (lambda) {
      // Store new data source created
      this.dataSourcesByDsKey[dataSourceKey] = dataSource;
      this.functionsByDsKey[dataSourceKey] = lambda;

      // attached existing permissions
      this.permissionsAttachedForAllFunctions.forEach((permissions) =>
        lambda!.attachPermissions(permissions)
      );
      lambda.bind(this.bindingForAllFunctions);
    }
    this.dsKeysByResKey[resKey] = dataSourceKey;

    ///////////////////
    // Create resolver
    ///////////////////
    const resolver = this.isSameStack(scope)
      ? this.cdk.graphqlApi.createResolver(`${typeName}${fieldName}Resolver`, {
          dataSource,
          typeName,
          fieldName,
          ...resolverProps,
        })
      : new Resolver(scope, `${typeName}${fieldName}Resolver`, {
          api: this.cdk.graphqlApi,
          dataSource,
          typeName,
          fieldName,
          ...resolverProps,
        });
    this.resolversByResKey[resKey] = resolver;

    return lambda;
  }

  private isLambdaResolverProps(object: AppSyncApiResolverProps): boolean {
    return object.function !== undefined;
  }

  private isDataSourceResolverProps(object: AppSyncApiResolverProps): boolean {
    return object.dataSource !== undefined;
  }

  private normalizeResolverKey(resolverKey: string): string {
    // remove extra spaces in the key
    return resolverKey.split(/\s+/).join(" ");
  }

  private buildMappingTemplate(mapping?: MappingTemplate) {
    if (!mapping) {
      return undefined;
    }

    if ((mapping as MappingTemplateFile).file) {
      return CDKMappingTemplate.fromFile((mapping as MappingTemplateFile).file);
    }

    return CDKMappingTemplate.fromString(
      (mapping as MappingTemplateInline).inline
    );
  }

  private buildDataSourceKey(typeName: string, fieldName: string) {
    return `LambdaDS_${typeName}_${fieldName}`;
  }

  private isSameStack(scope: Construct) {
    return Stack.of(this) === Stack.of(scope);
  }
}
