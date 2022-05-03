import { LayerVersion } from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack, app }: StackContext) {
  // Configure Sentry
  if (!app.local) {
    const sentry = LayerVersion.fromLayerVersionArn(
      stack,
      "SentryLayer",
      `arn:aws:lambda:${app.region}:943013980633:layer:SentryNodeServerlessSDK:35`
    );

    stack.addDefaultFunctionLayers([sentry]);
    stack.addDefaultFunctionEnv({
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_TRACES_SAMPLE_RATE: "1.0",
      NODE_OPTIONS: "-r @sentry/serverless/dist/awslambda-auto",
    });
  }

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "lambda.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
