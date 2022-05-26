import { StackContext, Api, ViteStaticSite } from "@serverless-stack/resources";

export function MyStack({ stack, app }: StackContext) {
  // Create Api
  const api = new Api(stack, "Api", {
    authorizers: {
      auth0: {
        type: "jwt",
        jwt: {
          issuer: process.env.AUTH0_DOMAIN,
          audience: [process.env.AUTH0_DOMAIN + "api/v2/"],
        },
      },
    },
    defaults: {
      authorizer: "auth0",
    },
    routes: {
      "GET /private": "functions/private.main",
      "GET /public": {
        function: "functions/public.main",
        authorizer: "none",
      },
    },
  });

  const site = new ViteStaticSite(stack, "Site", {
    path: "frontend",
    environment: {
      VITE_APP_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
      VITE_APP_AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
      VITE_APP_API_URL: api.url,
      VITE_APP_REGION: app.region,
    },
  });

  // Show the API endpoint and other info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    SiteUrl: site.url,
  });
}
