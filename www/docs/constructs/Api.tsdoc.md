<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Api(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[ApiProps](#apiprops)</span>
## ApiProps


### accessLog?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">boolean</span> | <span class="mono">[ApiAccessLogProps](#apiaccesslogprops)</span></span>

_Default_ : <span class="mono">true</span>

Enable CloudWatch access logs for this API


```js
new Api(stack, "Api", {
  accessLog: true
});
```

```js
new Api(stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
});
```

### authorizers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">[ApiUserPoolAuthorizer](#apiuserpoolauthorizer)</span> | <span class="mono">[ApiJwtAuthorizer](#apijwtauthorizer)</span> | <span class="mono">[ApiLambdaAuthorizer](#apilambdaauthorizer)</span></span>&gt;</span>

Define the authorizers for the API. Can be a user pool, JWT, or Lambda authorizers.


```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "user_pool",
      userPool: {
        id: userPool.userPoolId,
        clientIds: [userPoolClient.userPoolClientId],
      },
    },
  },
});
```

### cors?

_Type_ : <span class='mono'><span class="mono">boolean</span> | <span class="mono">[ApiCorsProps](#apicorsprops)</span></span>

_Default_ : <span class="mono">true</span>

CORS support applied to all endpoints in this API



```js
new Api(stack, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
});
```


### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[ApiDomainProps](#apidomainprops)</span></span>

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)


```js
new Api(stack, "Api", {
  customDomain: "api.example.com"
})
```

```js
new Api(stack, "Api", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
    path: "v1"
  }
})
```


### defaults.authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">[]</span>

An array of scopes to include in the authorization when using `user_pool` or `jwt` authorizers. These will be merged with the scopes from the attached authorizer.

### defaults.authorizer?

_Type_ : <span class='mono'><span class="mono">"iam"</span> | <span class="mono">"none"</span> | <span class="mono">string</span></span>

The default authorizer for all the routes in the API.


```js
new Api(stack, "Api", {
  defaults: {
    authorizer: "iam",
  }
});
```


```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "user_pool",
      userPool: {
        id: userPool.userPoolId,
        clientIds: [userPoolClient.userPoolClientId],
      },
    },
  },
  defaults: {
    authorizer: "Authorizer",
  }
});
```

### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new Api(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  }
});
```

### defaults.payloadFormatVersion?

_Type_ : <span class='mono'><span class="mono">"1.0"</span> | <span class="mono">"2.0"</span></span>

_Default_ : <span class="mono">"2.0"</span>

The [payload format version](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API.


### defaults.throttle.burst?

_Type_ : <span class="mono">number</span>

The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.


```js
new Api(stack, "Api", {
  defaults: {
    throttle: {
      burst: 100
    }
  }
})
```

### defaults.throttle.rate?

_Type_ : <span class="mono">number</span>

The [steady-state rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.


```js
new Api(stack, "Api", {
  defaults: {
    throttle: {
      rate: 10
    }
  }
})
```



### routes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[ApiFunctionRouteProps](#apifunctionrouteprops)</span> | <span class="mono">[ApiHttpRouteProps](#apihttprouteprops)</span> | <span class="mono">[ApiAlbRouteProps](#apialbrouteprops)</span> | <span class="mono">[ApiPothosRouteProps](#apipothosrouteprops)</span></span>&gt;</span>

Define the routes for the API. Can be a function, proxy to another API, or point to an ALB



```js
new Api(stack, "api", {
  routes: {
    "GET /notes"      : "src/list.main",
    "GET /notes/{id}" : "src/get.main",
    "$default": "src/default.main"
  }
})
```


### cdk.httpApi?

_Type_ : <span class='mono'><span class="mono">[IHttpApi](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IHttpApi.html)</span> | <span class="mono">[HttpApiProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApiProps.html)</span></span>

Import the underlying HTTP API or override the default configuration


```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(stack, "Api", {
  cdk: {
    httpApi: HttpApi.fromHttpApiAttributes(stack, "MyHttpApi", {
      httpApiId,
    }),
  }
});
```

### cdk.httpStages?

_Type_ : <span class='mono'>Array&lt;<span class="mono">Omit&lt;<span class="mono">[HttpStageProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpStageProps.html)</span>, <span class="mono">"httpApi"</span>&gt;</span>&gt;</span>

Configures the stages to create for the HTTP API.
Note that, a default stage is automatically created, unless the `cdk.httpApi.createDefaultStage` is set to `false.


```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(stack, "Api", {
  cdk: {
    httpStages: [{
      stageName: "dev",
      autoDeploy: false,
    }],
  }
});
```


## Properties
An instance of `Api` has the following properties.
### customDomainUrl

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

If custom domain is enabled, this is the custom domain URL of the Api.
:::note
If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [`domainName`](#domainname) is set to `api.domain.com` and the [`path`](#path) is `v1`, the custom domain URL of the API will be `https://api.domain.com/v1/`.
:::

### httpApiArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created API Gateway HTTP API

### httpApiId

_Type_ : <span class="mono">string</span>

The id of the internally created API Gateway HTTP API

### routes

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The routes for the Api

### url

_Type_ : <span class="mono">string</span>

The AWS generated URL of the Api.


### cdk.accessLogGroup?

_Type_ : <span class="mono">[LogGroup](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html)</span>

If access logs are enabled, this is the internally created CDK LogGroup instance.

### cdk.certificate?

_Type_ : <span class="mono">[Certificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.Certificate.html)</span>

If custom domain is enabled, this is the internally created CDK Certificate instance.

### cdk.domainName?

_Type_ : <span class="mono">[DomainName](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainName.html)</span>

If custom domain is enabled, this is the internally created CDK DomainName instance.

### cdk.httpApi

_Type_ : <span class="mono">[HttpApi](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApi.html)</span>

The internally created CDK HttpApi instance.


## Methods
An instance of `Api` has the following methods.
### addRoutes

```ts
addRoutes(scope, routes)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __routes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[ApiFunctionRouteProps](#apifunctionrouteprops)</span> | <span class="mono">[ApiHttpRouteProps](#apihttprouteprops)</span> | <span class="mono">[ApiAlbRouteProps](#apialbrouteprops)</span> | <span class="mono">[ApiPothosRouteProps](#apipothosrouteprops)</span></span>&gt;</span>


Adds routes to the Api after it has been created.


```js
api.addRoutes(stack, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to all the routes. This allows the functions to access other AWS resources.



```js
api.attachPermissions(["s3"]);
```

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey, permissions)
```
_Parameters_
- __routeKey__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to a specific route. This allows that function to access other AWS resources.


```js
const api = new Api(stack, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
  },
});

api.attachPermissionsToRoute("GET /notes", ["s3"]);
```


### getFunction

```ts
getFunction(routeKey)
```
_Parameters_
- __routeKey__ <span class="mono">string</span>


Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `GET /notes`.


```js
const api = new Api(stack, "Api", {
  routes: {
    "GET /notes": "src/list.main",
  },
});

const listFunction = api.getFunction("GET /notes");
```

## ApiCorsProps


### allowCredentials?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">false</span>

Specifies whether credentials are included in the CORS request.

### allowHeaders?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">Allow all headers.</span>

The collection of allowed headers.


```js
// Allow all headers
allowHeaders: ["*"]

// Allow specific headers
allowHeaders: ["Accept", "Content-Type", "Authorization"]
```

### allowMethods?

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"ANY"</span> | <span class="mono">"DELETE"</span> | <span class="mono">"GET"</span> | <span class="mono">"HEAD"</span> | <span class="mono">"OPTIONS"</span> | <span class="mono">"PATCH"</span> | <span class="mono">"POST"</span> | <span class="mono">"PUT"</span></span>&gt;</span>

_Default_ : <span class="mono">Allow all methods.</span>

The collection of allowed HTTP methods.


```js
// Allow all methods
allowMethods: ["ANY"]

// Allow specific methods
allowMethods: ["GET", "POST"]
```

### allowOrigins?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">Allow all origins.</span>

The collection of allowed origins.


```js
// Allow all origins
allowOrigins: ["*"]

// Allow specific origins. Note that the url protocol, ie. "https://", is required.
allowOrigins: ["https://domain.com"]
```

### exposeHeaders?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">No expose headers are allowed.</span>

The collection of exposed headers.

### maxAge?

_Type_ : <span class='mono'><span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

_Default_ : <span class="mono">No caching</span>

Specify how long the results of a preflight response can be cached


```js
maxAge: "1 day"
```

## ApiDomainProps


### domainName?

_Type_ : <span class="mono">string</span>

The domain to be assigned to the API endpoint (ie. api.domain.com)

### hostedZone?

_Type_ : <span class="mono">string</span>

The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone by stripping out the first part of the domainName that's passed in. So, if your domainName is api.domain.com. SST will default the hostedZone to domain.com.

### isExternalDomain?

_Type_ : <span class="mono">boolean</span>

Set this option if the domain is not hosted on Amazon Route 53.

### path?

_Type_ : <span class="mono">string</span>

The base mapping for the custom domain.
For example, by setting the domainName to api.domain.com and the path to v1, the custom domain URL of the API will become https://api.domain.com/v1/. If the path is not set, the custom domain URL will be https://api.domain.com. Note the additional trailing slash in the former case.


### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

Override the internally created certificate

### cdk.domainName?

_Type_ : <span class="mono">[IDomainName](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IDomainName.html)</span>

Override the internally created domain name

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

Override the internally created hosted zone


## ApiAlbRouteProps
Specify a route handler that forwards to an ALB


```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "alb",
    cdk: {
      albListener: listener,
    }
  }
});
```

### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class='mono'><span class="mono">"iam"</span> | <span class="mono">"none"</span> | <span class="mono">string</span></span>

### type

_Type_ : <span class="mono">"alb"</span>


### cdk.albListener

_Type_ : <span class="mono">[IApplicationListener](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IApplicationListener.IApplicationListener.html)</span>

The listener to the application load balancer used for the integration.

### cdk.integration?

_Type_ : <span class="mono">[HttpAlbIntegrationProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpAlbIntegrationProps.html)</span>


## ApiJwtAuthorizer
Specify a JWT authorizer and configure additional options.


```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "jwt",
      userPool: {
        issuer: "https://abc.us.auth0.com",
        audience: ["123"],
      },
    },
  },
});
```

### identitySource?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">`["$request.header.Authorization"]`</span>

The identity source for which authorization is requested.


### jwt.audience

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

A list of the intended recipients of the JWT.

### jwt.issuer

_Type_ : <span class="mono">string</span>

The base domain of the identity provider that issues JWT.


### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.

### type

_Type_ : <span class="mono">"jwt"</span>

String literal to signify that the authorizer is JWT authorizer.


### cdk.authorizer

_Type_ : <span class="mono">[HttpJwtAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpJwtAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.


## ApiAccessLogProps


### destinationArn?

_Type_ : <span class="mono">string</span>

### format?

_Type_ : <span class="mono">string</span>

### retention?

_Type_ : <span class='mono'><span class="mono">"one_day"</span> | <span class="mono">"three_days"</span> | <span class="mono">"five_days"</span> | <span class="mono">"one_week"</span> | <span class="mono">"two_weeks"</span> | <span class="mono">"one_month"</span> | <span class="mono">"two_months"</span> | <span class="mono">"three_months"</span> | <span class="mono">"four_months"</span> | <span class="mono">"five_months"</span> | <span class="mono">"six_months"</span> | <span class="mono">"one_year"</span> | <span class="mono">"thirteen_months"</span> | <span class="mono">"eighteen_months"</span> | <span class="mono">"two_years"</span> | <span class="mono">"five_years"</span> | <span class="mono">"six_years"</span> | <span class="mono">"seven_years"</span> | <span class="mono">"eight_years"</span> | <span class="mono">"nine_years"</span> | <span class="mono">"ten_years"</span> | <span class="mono">"infinite"</span></span>

## ApiHttpRouteProps
Specify a route handler that forwards to another URL


```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "url",
    url: "https://example.com/notes/{id}",
  }
});
```

### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class='mono'><span class="mono">"iam"</span> | <span class="mono">"none"</span> | <span class="mono">string</span></span>

### type

_Type_ : <span class="mono">"url"</span>

This is a constant

### url

_Type_ : <span class="mono">string</span>

The URL to forward to


### cdk.integration

_Type_ : <span class="mono">[HttpUrlIntegrationProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpUrlIntegrationProps.html)</span>

Override the underlying CDK integration


## ApiLambdaAuthorizer
Specify a Lambda authorizer and configure additional options.


```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "lambda",
      function: new Function(stack, "Authorizer", {
        handler: "test/lambda.handler",
      }),
    },
  },
});
```

### function?

_Type_ : <span class="mono">[Function](Function#function)</span>

Used to create the authorizer function

### identitySource?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">`["$request.header.Authorization"]`</span>

The identity source for which authorization is requested.

### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.

### responseTypes?

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"simple"</span> | <span class="mono">"iam"</span></span>&gt;</span>

_Default_ : <span class="mono">["iam"]</span>

The types of responses the lambda can return.
If `simple` is included then response format 2.0 will be used.
### resultsCacheTtl?

_Type_ : <span class='mono'><span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

_Default_ : <span class="mono">Not cached</span>

The amount of time the results are cached.

### type

_Type_ : <span class="mono">"lambda"</span>

String literal to signify that the authorizer is Lambda authorizer.


### cdk.authorizer

_Type_ : <span class="mono">[HttpLambdaAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpLambdaAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.


## ApiPothosRouteProps
Specify a route handler that handles GraphQL queries using Pothos


```js
api.addRoutes(stack, {
  "POST /graphql": {
     type: "pothos",
     schema: "backend/functions/graphql/schema.ts",
     output: "graphql/schema.graphql",
     function: {
       handler: "functions/graphql/graphql.ts",
     },
     commands: [
       "./genql graphql/graphql.schema graphql/
     ]
  }
})
```

### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class='mono'><span class="mono">"iam"</span> | <span class="mono">"none"</span> | <span class="mono">string</span></span>

### commands?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

Commands to run after generating schema. Useful for code generation steps

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function definition used to create the function for this route. Must be a graphql handler

### output?

_Type_ : <span class="mono">string</span>

File to write graphql schema to

### schema?

_Type_ : <span class="mono">string</span>

Path to pothos schema

### type

_Type_ : <span class="mono">"pothos"</span>

## ApiFunctionRouteProps
Specify a function route handler and configure additional options


```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "function",
    function: "src/get.main",
    payloadFormatVersion: "1.0",
  }
});
```

### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class='mono'><span class="mono">"iam"</span> | <span class="mono">"none"</span> | <span class="mono">string</span></span>

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function definition used to create the function for this route.

### payloadFormatVersion?

_Type_ : <span class='mono'><span class="mono">"1.0"</span> | <span class="mono">"2.0"</span></span>

_Default_ : <span class="mono">"2.0"</span>

The payload format version for the route.

### type?

_Type_ : <span class="mono">"function"</span>

## ApiUserPoolAuthorizer
Specify a user pool authorizer and configure additional options.


```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "user_pool",
      userPool: {
        id: userPool.userPoolId,
        clientIds: [userPoolClient.userPoolClientId],
      },
    },
  },
});
```

### identitySource?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">`["$request.header.Authorization"]`</span>

The identity source for which authorization is requested.

### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.

### type

_Type_ : <span class="mono">"user_pool"</span>

String li any shot and having even a miniscule shotteral to signify that the authorizer is user pool authorizer.


### userPool.clientIds?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The ids of the user pool clients to use for authorization.

### userPool.id

_Type_ : <span class="mono">string</span>

The id of the user pool to use for authorization.

### userPool.region?

_Type_ : <span class="mono">string</span>

The AWS region of the user pool.



### cdk.authorizer

_Type_ : <span class="mono">[HttpUserPoolAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpUserPoolAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.

