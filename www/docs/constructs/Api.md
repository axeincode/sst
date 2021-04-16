---
description: "Docs for the sst.Api construct in the @serverless-stack/resources package"
---

The `Api` construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

Unlike the lower level [`Function`](Function.md) construct, the `Api` construct doesn't directly extend a CDK construct, it wraps around a couple of them.

## Initializer

```ts
new Api(scope: Construct, id: string, props: ApiProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`ApiProps`](#apiprops)

## Examples

The `Api` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```js
import { Api } from "@serverless-stack/resources";

new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});
```

Note that, the route key can have extra spaces in between, they are just ignored.

### Adding routes

Add routes after the API has been created.

```js
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
  },
});

api.addRoutes(this, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
```

### Lazily adding routes

Create an _empty_ Api construct and lazily add the routes.

```js {3-6}
const api = new Api(this, "Api");

api.addRoutes(this, {
  "GET    /notes": "src/list.main",
  "POST   /notes": "src/create.main",
});
```

### Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js {2-6}
new Api(this, "Api", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});
```

### Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`ApiRouteProps`](#apirouteprops).

```js
new Api(this, "Api", {
  routes: {
    "GET /notes": {
      function: {
        srcPath: "src/",
        handler: "list.main",
        environment: { tableName: table.tableName },
        permissions: [table],
      },
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per route. The `function` will just override the `defaultFunctionProps`. Except for the `environment` and the `permissions` properties, that will be merged.

```js
new Api(this, "Api", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  routes: {
    "GET /notes": {
      function: {
        handler: "list.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
    },
    "POST /notes": "create.main",
  },
});
```

So in the above example, the `GET /notes` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

### Configuring the Http Api

Configure the internally created CDK `Api` instance.

```js {2-4}
new Api(this, "Api", {
  httpApi: {
    disableExecuteApiEndpoint: true,
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Importing an existing Http Api

Override the internally created CDK `HttpApi` instance.

```js {4-6}
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";

new Api(this, "Api", {
  httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
    httpApiId,
  }),
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring the access log format

Use a CSV format instead of default JSON format.

```js {2-3}
new Api(this, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {4-6}
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

new Api(this, "Api", {
  cors: {
    allowMethods: [HttpMethod.GET],
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring custom domains

You can also configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Using the basic config

```js {2}
new Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Configuring with a wildcard

```js {2}
new Api(this, "Api", {
  customDomain: "*.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Using the full config

```js {2-6}
new Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    path: "v1",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Mapping multiple APIs to the same domain

```js {9-12}
const usersApi = new Api(this, "UsersApi", {
  customDomain: {
    domainName: "api.domain.com",
    path: "users",
  },
});

new Api(this, "PostsApi", {
  customDomain: {
    domainName: usersApi.apiGatewayDomain,
    path: "posts",
  },
});
```

#### Importing an existing API Gateway custom domain

```js {5-13}
import { DomainName } from "@aws-cdk/aws-apigatewayv2";

new Api(this, "Api", {
  customDomain: {
    domainName: DomainName.fromDomainNameAttributes(this, "MyDomain", {
      name,
      regionalDomainName,
      regionalHostedZoneId,
    }),
    path: "newPath",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Importing an existing certificate

```js {6-10}
import { Certificate } from "@aws-cdk/aws-certificatemanager";

new Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Attaching permissions

You can attach a set of permissions to all or some of the routes.

#### For the entire API

Allow the entire API to access S3.

```js {11}
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

api.attachPermissions(["s3"]);
```

#### For a specific route

Allow one of the routes to access S3.

```js {11}
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

api.attachPermissionsToRoute("GET /notes", ["s3"]);
```

### Adding auth

You can use IAM or JWT to add auth to your APIs.

#### Adding IAM authorization

You can secure your APIs (and other AWS resources) by setting the `defaultAuthorizationType` to `AWS_IAM` and using the [`Auth`](Auth.md) construct.

```js {2}
new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

#### Adding IAM authorization to a specific route

You can also secure specific routes in your APIs by setting the `authorizationType` to `AWS_IAM` and using the [`Auth`](Auth.md) construct.

```js {5}
new Api(this, "Api", {
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizationType: ApiAuthorizationType.AWS_IAM,
      function: "src/private.main",
    },
  },
});
```

#### Adding JWT authorization

[JWT](https://jwt.io/introduction) allows authorized users to access your API. Note that, this is a different authorization method when compared to using `AWS_IAM` and the [`Auth`](Auth.md) construct, which allows you to secure other AWS resources as well.

```js {4-8}
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpJwtAuthorizer({
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
    jwtIssuer: "https://myorg.us.auth0.com",
  }),
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Adding JWT authorization to a specific route

You can also secure specific routes using JWT by setting the `authorizationType` per route.

```js {13}
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizer: new HttpJwtAuthorizer({
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
    jwtIssuer: "https://myorg.us.auth0.com",
  }),
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      function: {
        handler: "src/private.main",
        authorizationType: ApiAuthorizationType.JWT,
      },
    },
  },
});
```

Note that, setting a specific authorizer per route is not currently supported. It must be set for all the applicable routes as the `defaultAuthorizer`.

#### Using Cognito User Pool as the JWT authorizer

JWT can also use a Cognito User Pool as an authorizer.

```js {4-9}
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpUserPoolAuthorizer({
    userPool,
    userPoolClient,
  }),
  defaultAuthorizationScopes: ["user.id", "user.email"],
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Getting the function for a route

```js {11}
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

const listFunction = api.getFunction("GET /notes");
```

## Properties

An instance of `Api` contains the following properties.

### httpApi

_Type_: [`cdk.aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html)

The internally created CDK `HttpApi` instance.

### accessLogGroup?

_Type_: [`cdk.aws-logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)

If access logs are enabled, this is the internally created CDK `LogGroup` instance.

### apiGatewayDomain?

_Type_: [`cdk.aws-apigatewayv2.DomainName`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.DomainName.html)

If custom domain is enabled, this is the internally created CDK `DomainName` instance.

### acmCertificate?

_Type_: [`cdk.aws-certificatemanager.Certificate`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-certificatemanager.Certificate.html)

If custom domain is enabled, this is the internally created CDK `Certificate` instance.

## Methods

An instance of `Api` contains the following methods.

### getFunction

```ts
getFunction(routeKey: string): Function
```

_Parameters_

- **routeKey** `string`

_Returns_

- [`Function`](Function.md)

Get the instance of the internally created [`Function`](Function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `GET /notes`.

### addRoutes

```ts
addRoutes(scope: cdk.Construct, routes: { [key: string]: FunctionDefinition | ApiRouteProps })
```

_Parameters_

- **scope** `cdk.Construct`
- **routes** `{ [key: string]: FunctionDefinition | ApiRouteProps }`

An associative array with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`ApiRouteProps`](#apirouteprops).

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the routes. This allows the functions to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```

_Parameters_

- **routeKey** `string`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific route. This allows that function to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## ApiProps

### routes?

_Type_ : `{ [key: string]: FunctionDefinition | ApiRouteProps }`, _defaults to_ `{}`

The routes for this API. Takes an associative array, with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition).

```js
{
  "GET /notes": "src/list.main",
  "GET /notes/{id}": "src/get.main",
}
```

Or the [ApiRouteProps](#apirouteprops).

```js
{
  "GET /notes": {
    authorizationType: ApiAuthorizationType.AWS_IAM,
    function: {
      handler: "src/list.main",
      environment: {
        TABLE_NAME: "notesTable",
      },
    }
  },
}
```

### cors?

_Type_ : `boolean | cdk.aws-apigatewayv2.CorsPreflightOptions`, _defaults to_ `true`

CORS support for all the endpoints in the API. Takes a `boolean` value or a [`cdk.aws-apigatewayv2.CorsPreflightOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.CorsPreflightOptions.html).

### accessLog?

_Type_ : `boolean | string | cdk.aws-apigatewayv2.CfnApiGatewayManagedOverrides.AccessLogSettingsProperty`, _defaults to_ `true`

CloudWatch access logs for the API. Takes a `boolean` value, a `string` with log format, or a [`cdk.aws-apigatewayv2.CfnApiGatewayManagedOverrides.AccessLogSettingsProperty`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.CfnApiGatewayManagedOverrides.AccessLogSettingsProperty.html).

### customDomain?

_Type_ : `string | ApiCustomDomainProps`

The customDomain for this API. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

Takes either the domain as a string.

```
"api.domain.com"
```

Or the [ApiCustomDomainProps](#apicustomdomainprops).

```js
{
  domainName: "api.domain.com",
  hostedZone: "domain.com",
  path: "v1",
}
```

### httpApi?

_Type_ : `cdk.aws-apigatewayv2.HttpApiProps | cdk.aws-apigatewayv2.HttpApi`

Pass in a [`cdk.aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html) value to override the default settings this construct uses to create the CDK `HttpApi` internally.

Or, pass in an instance of the CDK [`cdk.aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html). SST will use the provided CDK `HttpApi` instead of creating one internally.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the API. If the `function` is specified for a route, these default values are overridden. Except for the `environment` and the `permissions` properties, that will be merged.

### defaultAuthorizationType?

_Type_ : `ApiAuthorizationType`, _defaults to_ `ApiAuthorizationType.NONE`

The authorization type for all the endpoints in the API. Set using [`ApiAuthorizationType`](#apiauthorizationtype). Supports AWS IAM and JWT. Defaults to no authorization, `ApiAuthorizationType.NONE`.

While both IAM and JWT allows you to secure your APIs. The IAM method together with the [`Auth`](Auth.md) construct uses the [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). This allows you to secure other AWS resources as well.

On the other hand, the [JWT](https://jwt.io/introduction) method is for securing APIs specifically.

If you are just starting out, we recommend using the IAM method.

### defaultAuthorizer?

_Type_ : `cdk.aws-apigatewayv2-authorizers.HttpJwtAuthorizer | cdk.aws-apigatewayv2-authorizers.HttpUserPoolAuthorizer`

The JWT authorizer for all the routes in the API. Currently, supports [`cdk.aws-apigatewayv2-authorizers.HttpJwtAuthorizer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2-authorizers.HttpJwtAuthorizer.html) or [`cdk.aws-apigatewayv2-authorizers.HttpUserPoolAuthorizer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2-authorizers.HttpUserPoolAuthorizer.html).

### defaultAuthorizationScopes?

_Type_ : `string[]`, _defaults to_ `[]`

An array of scopes to include in the authorization when using `JWT` as the `defaultAuthorizationType`. These will be merged with the scopes from the attached authorizer.

For example, `["user.id", "user.email"]`.

### defaultPayloadFormatVersion?

_Type_ : `ApiPayloadFormatVersion`, _defaults to_ `ApiPayloadFormatVersion.V2`

The [payload format versions](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API. Set using [`ApiPayloadFormatVersion`](#apipayloadformatversion). Supports 2.0 and 1.0. Defaults to 2.0, `ApiPayloadFormatVersion.V2`.

## ApiRouteProps

### function

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the function for this route.

### authorizationType?

_Type_ : `ApiAuthorizationType`

The authorization type for a specific route. Set using [`ApiAuthorizationType`](#apiauthorizationtype). Defaults to [`defaultAuthorizationType`](#defaultauthorizationtype).

### authorizer?

_Type_ : `cdk.aws-apigatewayv2-authorizers.HttpJwtAuthorizer | cdk.aws-apigatewayv2-authorizers.HttpUserPoolAuthorizer`

The JWT authorizer for a specific route. Defaults to [`defaultAuthorizer`](#defaultauthorizer).

### authorizationScopes?

_Type_ : `string[]`

An array of scopes to include in the authorization for a specific route. Defaults to [`defaultAuthorizationScopes`](#defaultauthorizationscopes). If both `defaultAuthorizationScopes` and `authorizationScopes` are configured, `authorizationScopes` is used. Instead of the union of both.

### payloadFormatVersion?

_Type_ : `ApiPayloadFormatVersion`

The [payload format versions](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for a specific route. Set using [`ApiPayloadFormatVersion`](#apipayloadformatversion). Supports 2.0 and 1.0. Defaults to [`defaultPayloadFormatVersion`](#defaultpayloadformatversion).

## ApiCustomDomainProps

### domainName

_Type_ : `string | cdk.aws-apigatewayv2.DomainName`

The domain to be assigned to the API endpoint. Takes the custom domain as a `string` (ie. `api.domain.com`) or a [`cdk.aws-apigatewayv2.DomainName`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.DomainName.html).

Currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/).

### hostedZone?

_Type_ : `string | cdk.aws-route53.HostedZone`, _defaults to the base domain_

The hosted zone in Route 53 that contains the domain. Takes the name of the hosted zone as a `string` or the hosted zone construct [`cdk.aws-route53.HostedZone`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-route53.HostedZone.html). By default, SST will look for a hosted zone by stripping out the first part of the `domainName` that's passed in. So, if your `domainName` is `api.domain.com`. SST will default the `hostedZone` to `domain.com`.

Set this option if SST cannot find the hosted zone in Route 53.

### certificate?

_Type_ : [`cdk.aws-certificatemanager.Certificate`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-certificatemanager.Certificate.html), _defaults to `undefined`_

The certificate for the domain. By default, SST will create a certificate with the domain name from the `domainName` option.

Set this option if you have an existing certificate in AWS Certificate Manager you want to use.

### path?

_Type_ : `string`, _defaults to_ `undefined`

The base mapping for the custom domain. For example, by setting the `domainName` to `api.domain.com` and `path` to `v1`, the custom domain URL for the API will become `https://api.domain.com/v1`. If the `path` is not set, the custom domain URL will be `https://api.domain.com`.

:::caution
You cannot change the path once it has been set.
:::

Note, if the `path` was not defined initially, it cannot be defined later. If the `path` was initially defined, it cannot be later changed to _undefined_. Instead, you'd need to remove the `customDomain` option from the construct, deploy it. And then set it to the new path value.

## ApiAuthorizationType

An enum with the following members representing the authorization types.

| Member  | Description                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------- |
| AWS_IAM | Used along with the [`Auth`](Auth.md) construct to add Cognito Identity Pool and IAM authorization. |
| JWT     | Using [JWT](https://jwt.io/introduction) as an authorizer.                                          |
| NONE    | No authorization type is set.                                                                       |

For example, to use IAM, set `ApiAuthorizationType.AWS_IAM`.

## ApiPayloadFormatVersion

An enum with the following members representing the payload format versions.

| Member | Description                                               |
| ------ | --------------------------------------------------------- |
| V2     | Version 2.0 of the payload is sent to the lambda handler. |
| V1     | Version 1.0 of the payload is sent to the lambda handler. |

For example, to use V2, set `ApiPayloadFormatVersion.V2`.
