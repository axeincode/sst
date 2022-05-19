import { Api, EventBus, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  const bus = new EventBus(stack, "Ordered", {
    rules: {
      rule1: {
        pattern: {
          source: ["myevent"],
          detailType: ["Order"],
        },
        targets: {
          receipt: "functions/receipt.handler",
          shipping: "functions/shipping.handler",
        },
      },
    },
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          busName: bus.eventBusName,
        },
      },
    },
    routes: {
      "POST /order": "functions/order.handler",
    },
  });

  api.attachPermissions([bus]);

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
