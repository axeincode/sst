import path from "path";
import glob from "glob";
import fs from "fs-extra";
import * as crypto from "crypto";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import { App } from "./App.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import { Function as Fn } from "./Function.js";
import url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/////////////////////
// Interfaces
/////////////////////

export interface RDSProps {
  /**
   * Database engine of the cluster. Cannot be changed once set.
   */
  engine: "mysql5.6" | "mysql5.7" | "postgresql10.14";

  /**
   * Name of a database which is automatically created inside the cluster.
   */
  defaultDatabaseName: string;

  scaling?: {
    /**
     * The time before the cluster is paused.
     *
     * Pass in true to pause after 5 minutes of inactive. And pass in false to
     * disable pausing.
     *
     * Or pass in the number of minutes to wait before the cluster is paused.
     *
     * @default true
     *
     * @example
     * ```js
     * new RDS(stack, "Database", {
     *   scaling: {
     *     autoPause: props.app.stage !== "prod"
     *   }
     * })
     * ```
     */
    autoPause?: boolean | number;

    /**
     * The minimum capacity for the cluster.
     *
     * @default "ACU_2"
     */
    minCapacity?: keyof typeof rds.AuroraCapacityUnit;

    /**
     * The maximum capacity for the cluster.
     *
     * @default "ACU_16"
     */
    maxCapacity?: keyof typeof rds.AuroraCapacityUnit;
  };

  /**
   * Path to the directory that contains the migration scripts. The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.
   *
   * @example
   *
   * ```js
   * new RDS(stack, "Database", {
   *   engine: "postgresql10.14",
   *   defaultDatabaseName: "acme",
   *   migrations: "path/to/migration/scripts",
   * });
   * ```
   */
  migrations?: string;

  /**
   * Path to place generated typescript types after running migrations
   *
   * @example
   *
   * ```js
   * new RDS(stack, "Database", {
   *   engine: "postgresql10.14",
   *   defaultDatabaseName: "acme",
   *   migrations: "path/to/migration/scripts",
   *   types: "backend/core/sql/types.ts",
   * });
   * ```
   */
  types?: string;

  cdk?: {
    /**
     * Configure the internallly created RDS cluster.
     *
     * @example
     * ```js
     * new RDS(stack, "Database", {
     *   cdk: {
     *     cluster: {
     *       clusterIdentifier: "my-cluster",
     *     }
     *   },
     * });
     * ```
     *
     * Alternatively, you can import an existing RDS Serverless v1 Cluster in your AWS account.
     *
     * @example
     * ```js
     * new RDS(stack, "Database", {
     *   cdk: {
     *     cluster: rds.ServerlessCluster.fromServerlessClusterAttributes(stack, "ICluster", {
     *       clusterIdentifier: "my-cluster",
     *     }),
     *     secret: secretsManager.Secret.fromSecretAttributes(stack, "ISecret", {
     *       secretPartialArn: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
     *     }),
     *   },
     * });
     * ```
     */
    cluster?: rds.IServerlessCluster | RDSCdkServerlessClusterProps;
    /**
     * Required when importing existing RDS Serverless v1 Cluster.
     */
    secret?: secretsManager.ISecret;
  };
}

export type RDSEngineType = "mysql5.6" | "mysql5.7" | "postgresql10.14";

export interface RDSCdkServerlessClusterProps
  extends Omit<
    rds.ServerlessClusterProps,
    "vpc" | "engine" | "defaultDatabaseName" | "scaling"
  > {
  vpc?: ec2.IVpc;
}

/////////////////////
// Construct
/////////////////////

/**
 * The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/).
 *
 * @example
 *
 * ```js
 * import { RDS } from "@serverless-stack/resources";
 *
 * new RDS(stack, "Database", {
 *   engine: "postgresql10.14",
 *   defaultDatabaseName: "my_database",
 * });
 * ```
 */
export class RDS extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The ARN of the internally created CDK ServerlessCluster instance.
     */
    cluster: rds.ServerlessCluster;
  };
  /**
   * The ARN of the internally created CDK ServerlessCluster instance.
   */
  public migratorFunction?: Fn;
  private props: RDSProps;
  private secret: secretsManager.ISecret;

  constructor(scope: Construct, id: string, props: RDSProps) {
    super(scope, id);

    this.validateRequiredProps(props);

    this.cdk = {} as any;
    this.props = props || {};

    const { migrations, cdk } = this.props;

    // Create the cluster
    if (cdk && isCDKConstruct(cdk.cluster)) {
      this.validateCDKPropWhenIsConstruct();
      this.cdk.cluster = this.importCluster();
      this.secret = cdk.secret!;
    } else {
      this.validateCDKPropWhenIsClusterProps();
      this.cdk.cluster = this.createCluster();
      this.secret = this.cdk.cluster.secret!;
    }

    // Create the migrator function
    if (migrations) {
      this.validateMigrationsFileExists(migrations);
      this.createMigrationsFunction(migrations);
      this.createMigrationCustomResource(migrations);
    }
  }

  /**
   * The ARN of the internally created RDS Serverless Cluster.
   */
  public get clusterArn(): string {
    return this.cdk.cluster.clusterArn;
  }

  /**
   * The ARN of the internally created RDS Serverless Cluster.
   */
  public get clusterIdentifier(): string {
    return this.cdk.cluster.clusterIdentifier;
  }

  /**
   * The ARN of the internally created RDS Serverless Cluster.
   */
  public get clusterEndpoint(): rds.Endpoint {
    return this.cdk.cluster.clusterEndpoint;
  }

  /**
   * The default database name of the RDS Serverless Cluster.
   */
  public get defaultDatabaseName(): string {
    return this.props.defaultDatabaseName;
  }

  /**
   * The ARN of the internally created Secrets Manager Secret.
   */
  public get secretArn(): string {
    return this.secret.secretArn;
  }

  public getConstructMetadata() {
    const { engine, defaultDatabaseName, types } = this.props;
    return {
      type: "RDS" as const,
      data: {
        engine,
        secretArn: this.secretArn,
        types,
        clusterArn: this.clusterArn,
        clusterIdentifier: this.clusterIdentifier,
        defaultDatabaseName,
        migrator:
          this.migratorFunction && getFunctionRef(this.migratorFunction),
      },
    };
  }

  private validateRequiredProps(props: RDSProps) {
    if (!props.engine) {
      throw new Error(`Missing "engine" in the "${this.node.id}" RDS`);
    }

    if (!props.defaultDatabaseName) {
      throw new Error(
        `Missing "defaultDatabaseName" in the "${this.node.id}" RDS`
      );
    }
  }

  private validateCDKPropWhenIsConstruct() {
    const { cdk } = this.props;
    if (!cdk?.secret) {
      throw new Error(
        `Missing "cdk.secret" in the "${this.node.id}" RDS. You must provide a secret to import an existing RDS Serverless Cluster.`
      );
    }
  }

  private validateCDKPropWhenIsClusterProps() {
    const { cdk } = this.props;
    const props = (cdk?.cluster || {}) as RDSCdkServerlessClusterProps;

    // Validate "engine" is passed in from the top level
    if ((props as any).engine) {
      throw new Error(
        `Use "engine" instead of "cdk.cluster.engine" to configure the RDS database engine.`
      );
    }

    // Validate "defaultDatabaseName" is passed in from the top level
    if ((props as any).defaultDatabaseName) {
      throw new Error(
        `Use "defaultDatabaseName" instead of "cdk.cluster.defaultDatabaseName" to configure the RDS database engine.`
      );
    }

    // Validate "scaling" is passed in from the top level
    if ((props as any).scaling) {
      throw new Error(
        `Use "scaling" instead of "cdk.cluster.scaling" to configure the RDS database auto-scaling.`
      );
    }

    // Validate "enableDataApi" is not passed in
    if (props.enableDataApi === false) {
      throw new Error(
        `Do not configure the "cdk.cluster.enableDataApi". Data API is always enabled for this construct.`
      );
    }

    // Validate Secrets Manager is used for "credentials"
    if (props.credentials && !props.credentials.secret) {
      throw new Error(
        `Only credentials managed by SecretManager are supported for the "cdk.cluster.credentials".`
      );
    }

    return props;
  }

  private validateMigrationsFileExists(migrations: string) {
    if (!fs.existsSync(migrations))
      throw new Error(
        `Cannot find the migrations in "${path.resolve(migrations)}".`
      );
  }

  private getEngine(engine: RDSEngineType): rds.IClusterEngine {
    if (engine === "mysql5.6") {
      return rds.DatabaseClusterEngine.aurora({
        version: rds.AuroraEngineVersion.VER_10A,
      });
    } else if (engine === "mysql5.7") {
      return rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_07_1,
      });
    } else if (engine === "postgresql10.14") {
      return rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_10_14,
      });
    }

    throw new Error(
      `The specified "engine" is not supported for sst.RDS. Only mysql5.6, mysql5.7, and postgresql10.14 engines are currently supported.`
    );
  }

  private getScaling(
    scaling?: RDSProps["scaling"]
  ): rds.ServerlessScalingOptions {
    return {
      autoPause:
        scaling?.autoPause === false
          ? cdk.Duration.minutes(0)
          : scaling?.autoPause === true || scaling?.autoPause === undefined
          ? cdk.Duration.minutes(5)
          : cdk.Duration.minutes(scaling?.autoPause),
      minCapacity: rds.AuroraCapacityUnit[scaling?.minCapacity || "ACU_2"],
      maxCapacity: rds.AuroraCapacityUnit[scaling?.maxCapacity || "ACU_16"],
    };
  }

  private getVpc(props: RDSCdkServerlessClusterProps): ec2.IVpc {
    if (props.vpc) {
      return props.vpc;
    }

    return new ec2.Vpc(this, "vpc", {
      natGateways: 0,
    });
  }

  private getVpcSubnets(
    props: RDSCdkServerlessClusterProps
  ): ec2.SubnetSelection | undefined {
    if (props.vpc) {
      return props.vpcSubnets;
    }

    return {
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    };
  }

  private createCluster() {
    const { engine, defaultDatabaseName, scaling, cdk } = this.props;
    const app = this.node.root as App;
    const clusterProps = (cdk?.cluster || {}) as RDSCdkServerlessClusterProps;

    return new rds.ServerlessCluster(this, "Cluster", {
      clusterIdentifier: app.logicalPrefixedName(this.node.id),
      ...clusterProps,
      defaultDatabaseName: defaultDatabaseName,
      enableDataApi: true,
      engine: this.getEngine(engine),
      scaling: this.getScaling(scaling),
      vpc: this.getVpc(clusterProps),
      vpcSubnets: this.getVpcSubnets(clusterProps),
    });
  }

  private importCluster() {
    const { cdk } = this.props;
    return cdk!.cluster as rds.ServerlessCluster;
  }

  private createMigrationsFunction(migrations: string) {
    const { engine, defaultDatabaseName } = this.props;
    const app = this.node.root as App;

    // path to migration scripts inside the Lambda function
    const migrationsDestination = "sst_rds_migration_scripts";

    // fullpath of the migrator Lambda function
    // Note:
    // - when invoked from `sst build`, __dirname is `resources/dist`
    // - when running resources tests, __dirname is `resources/src`
    // For now we will do `__dirname/../dist` to make both cases work.
    const srcPath = path.resolve(path.join(__dirname, "../dist/RDS_migrator"));

    const fn = new Fn(this, "MigrationFunction", {
      srcPath,
      handler: "index.handler",
      runtime: "nodejs16.x",
      timeout: 900,
      memorySize: 1024,
      environment: {
        RDS_ARN: this.cdk.cluster.clusterArn,
        RDS_SECRET: this.cdk.cluster.secret!.secretArn,
        RDS_DATABASE: defaultDatabaseName,
        RDS_ENGINE_MODE: engine === "postgresql10.14" ? "postgres" : "mysql",
        // for live development, perserve the migrations path so the migrator
        // can locate the migration files
        RDS_MIGRATIONS_PATH: app.local ? migrations : migrationsDestination,
      },
      bundle: {
        format: "esm",
        // Note that we need to generate a relative path of the migrations off the
        // srcPath because sst.Function internally builds the copy "from" path by
        // joining the srcPath and the from path.
        copyFiles: [
          {
            from: path.relative(
              path.resolve(srcPath),
              path.resolve(migrations)
            ),
            to: migrationsDestination,
          },
        ],
      },
    });

    fn.attachPermissions([this.cdk.cluster]);

    this.migratorFunction = fn;
  }

  private createMigrationCustomResource(migrations: string) {
    const app = this.node.root as App;

    // Create custom resource handler
    const handler = new lambda.Function(this, "MigrationHandler", {
      code: lambda.Code.fromAsset(path.join(__dirname, "Script")),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
    });
    this.migratorFunction?.grantInvoke(handler);

    // Note: "MigrationsHash" is generated to ensure the Custom Resource function
    //       is only run when migration files change.
    //
    //       Do not use the hash in Live mode, b/c we want the custom resource
    //       to remain the same in CloudFormation template when rebuilding
    //       infrastructure. Otherwise, there will always be a change when
    //       rebuilding infrastructure b/c the "BuildAt" property changes on
    //       each build.
    const hash = app.local ? 0 : this.generateMigrationsHash(migrations);
    new cdk.CustomResource(this, "MigrationResource", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTScript",
      properties: {
        UserCreateFunction: app.local
          ? undefined
          : this.migratorFunction?.functionName,
        UserUpdateFunction: app.local
          ? undefined
          : this.migratorFunction?.functionName,
        UserParams: JSON.stringify({}),
        MigrationsHash: hash,
      },
    });
  }

  private generateMigrationsHash(migrations: string): string {
    // Get all files inside the migrations folder
    const files = glob.sync("**", {
      dot: true,
      nodir: true,
      follow: true,
      cwd: migrations,
    });

    // Calculate hash of all files content
    return crypto
      .createHash("md5")
      .update(
        files
          .map((file) => fs.readFileSync(path.join(migrations, file)))
          .join("")
      )
      .digest("hex");
  }
}
