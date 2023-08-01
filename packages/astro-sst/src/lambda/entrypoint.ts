import type { SSRManifest } from "astro";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { polyfill } from "@astrojs/webapi";
import { getRequest, setResponse } from "./transform";
import { NodeApp } from "astro/app/node";
import { ResponseStream } from ".";

polyfill(globalThis, {
  exclude: "window document",
});

export function createExports(manifest: SSRManifest) {
  const app = new NodeApp(manifest);

  const handler = async (
    event: APIGatewayProxyEventV2,
    responseStream: ResponseStream
  ) => {
    let request: Request;

    try {
      request = await getRequest(event);
    } catch (err: any) {
      return streamError(400, err, responseStream);
    }

    const routeData = app.match(request, { matchNotFound: true });
    if (!routeData) {
      return streamError(404, "Not found", responseStream);
    }

    // Process request
    const response = await app.render(request, routeData);

    // Stream response back to Cloudfront
    await setResponse(app, responseStream, response);
  };

  return {
    // https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
    handler: awslambda.streamifyResponse(handler),
  };
}

export function streamError(
  statusCode: number,
  error: string | Error,
  responseStream: ResponseStream
) {
  console.error(error);

  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode,
  });

  responseStream.write(error.toString());
  responseStream.end();
}
