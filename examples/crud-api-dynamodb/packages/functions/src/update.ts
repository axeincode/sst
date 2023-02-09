import AWS from "aws-sdk";
import { Table } from "@serverless-stack/node/table";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  const data = JSON.parse(event.body);

  const params = {
    // Get the table name from the environment variable
    TableName: Table.Notes.tableName,
    // Get the row where the noteId is the one in the path
    Key: {
      userId: "123",
      noteId: event.pathParameters.id,
    },
    // Update the "content" column with the one passed in
    UpdateExpression: "SET content = :content",
    ExpressionAttributeValues: {
      ":content": data.content || null,
    },
    ReturnValues: "ALL_NEW",
  };

  const results = await dynamoDb.update(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(results.Attributes),
  };
};
