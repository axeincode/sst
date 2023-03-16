import { Api, KinesisStream, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // create a kinesis stream
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumer1: "packages/functions/src/consumer1.handler",
      consumer2: "packages/functions/src/consumer2.handler",
    },
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        bind: [stream],
      },
    },
    routes: {
      "POST /": "packages/functions/src/lambda.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
