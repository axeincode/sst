import { CfnOutput } from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as sst from "@serverless-stack/resources";

const service = "cdknotes";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const stage = this.node.root.stage;

    // Create a DynamoDb table
    const stageTableName = this.node.root.logicalPrefixedName("notes");
    const table = new dynamodb.Table(this, stageTableName, {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "noteId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Create a Lambda function
    new sst.Function(this, "MyLambda", {
      bundle: true,
      srcPath: "src",
      handler: "lambda.handler",
    });

    // Export values
    new CfnOutput(this, "notesTableName", {
      exportName: `${stage}-${service}-ExtNotesTableName`,
      value: table.tableName,
    });
    new CfnOutput(this, "notesTableArn", {
      exportName: `${stage}-${service}-ExtNotesTableArn`,
      value: table.tableArn,
    });
  }
}
