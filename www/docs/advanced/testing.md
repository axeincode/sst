---
title: Testing
description: "Learn how to write tests for your SST apps."
---

import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

SST apps come with a great setup for writing tests.

</HeadlineText>

:::tip
Want to learn more about testing in SST? Check out the [livestream we did on YouTube](https://youtu.be/YtaxDURRjHA).
:::

---

## Overview

To start, there are 3 types of tests you can write for your SST apps:

1. Tests for your domain code. We recommend [Domain Driven Design](../learn/domain-driven-design.md).
2. Tests for your APIs, the endpoints handling requests.
3. Tests for your stacks, the code that creates your infrastructure.

SST uses [Vitest](https://vitest.dev) to help you write these tests. And it uses the [`sst load-config`](../packages/cli.md#load-config) CLI to load your app's environment variables and secrets.

---

## Get started

In this chapter we'll look at the different types of tests and share some tips on how to write them.

To follow along, you can create the GraphQL starter by running `npx create-sst@latest` > `graphql` > `DynamoDB`. Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/create-sst-dynamo) based on the same template.

If you are new to the GraphQL starter, it creates a very simple Reddit clone. You can submit links and it'll display all the links that have been submitted. You can check out the [Quick start](../quick-start.md) to see how it works.

---

### Test script

If you created your app with `create-sst` a [Vitest](https://vitest.dev/config/) config is added for you, with a test script in your `package.json`:

```json {8} title="package.json"
"scripts": {
  "start": "sst start",
  "build": "sst build",
  "deploy": "sst deploy",
  "remove": "sst remove",
  "console": "sst console",
  "typecheck": "tsc --noEmit",
  "test": "sst load-config -- vitest run"
},
```

We'll look at how the `sst load-config` CLI works a little in the chapter.

:::note
If you created your app using `create-sst` prior to v1.9.0, make sure to prepend `sst load-config --` to your test script.
:::

You can now run your tests using.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm test
```

</TabItem>
<TabItem value="yarn">

```bash
yarn test
```

</TabItem>
</MultiPackagerCode>

---

### Testing domain code

Open up `services/core/article.ts`, it contains a `create()` function to create an article, and a `list()` function to list all submitted articles. This code is responsible for the _article domain_.

Let's write a test for our _article domain_ code. Create a new file at `services/test/core/article.test.ts`:

```ts title="services/test/core/article.test.ts"
import { expect, it } from "vitest";
import { Article } from "@my-sst-app/core/article";

it("create an article", async () => {
  // Create a new article
  const article = await Article.create("Hello world", "https://example.com");

  // List all articles
  const list = await Article.list();

  // Check the newly created article exists
  expect(list.find((a) => a.articleID === article.articleID)).not.toBeNull();
});
```

Both the `create()` and `list()` functions call `services/core/dynamo.ts` to talk to the database. And `services/core/dynamo.ts` references `Config.TABLE_NAME`.

<details>
<summary>Behind the scenes</summary>

The above test only works if we run `sst load-config -- vitest run`. The `sst load-config` CLI fetches the value for the `TABLE_NAME` and passes it to the test. If we run `vitest run` directly, we'll get an error complaining that `Config.TABLE_NAME` cannot be resolved.

</details>

---

### Testing APIs

We can rewrite the above test so that instead of calling `Article.create()`, you make a request to the GraphQL API to create the article. In fact, the GraphQL stack template already includes this test.

To call the GraphQL API in our test, we need to know the API's URL. We create a [`Parameter`](../environment-variables.md#configparameter) in `stacks/Api.ts`:

```ts title="stacks/Api.ts"
new Config.Parameter(stack, "API_URL", {
  value: api.url,
});
```

Open `services/test/graphql/article.test.ts`, you can see the test is similar to our domain function test above.

```ts
import { expect, it } from "vitest";
import { Config } from "@serverless-stack/node/config";
import { createClient } from "@my-sst-app/graphql/genql";
import { Article } from "@my-sst-app/core/article";

it("create an article", async () => {
  const client = createClient({
    url: Config.API_URL + "/graphql",
  });

  // Call the API to create a new article
  const article = await client.mutation({
    createArticle: [
      { title: "Hello world", url: "https://example.com" },
      {
        id: true,
      },
    ],
  });

  // List all articles
  const list = await Article.list();

  // Check the newly created article exists
  expect(
    list.find((a) => a.articleID === article.createArticle.id)
  ).not.toBeNull();
});
```

Again, just like the domain test above, this only works if we run [`sst load-config -- vitest run`](#how-sst-load-config-works).

:::tip
Testing APIs are often more useful than testing Domain code because they test the app from the perspective of a user. Ignoring most of the implementation details.
:::

Note that this test is very similar to the request frontend makes when a user tries to submit a link.

---

### Testing stacks

Both domain function tests and API tests are for testing your business logic code. Stack tests on the other hand allows you to test your infrastructure settings.

Let's write a test for our `Database` stack to ensure that [point-in-time recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) is enabled for our DynamoDB table.

Create a new file at `stacks/test/Database.test.ts`:

```ts
import { it } from "vitest";
import { Template } from "aws-cdk-lib/assertions";
import { App, getStack } from "@serverless-stack/resources";
import { Database } from "../Database";

it("point-in-time recovery is enabled", async () => {
  // Create the Database stack
  const app = new App();
  app.stack(Database);

  // Get the CloudFormation template of the stack
  const stack = getStack(Database);
  const template = Template.fromStack(stack);

  // Check point-in-time recovery is enabled
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
  });
});
```

The `aws-cdk-lib/assertions` import is a CDK helper library that makes it easy to test against AWS resources created inside a stack. In the test above, we are checking if there is a DynamoDB table created with `PointInTimeRecoveryEnabled` set to `true`.

---

#### Why test stacks

Like the test above, you can test for things like:

- Are the functions running with at least 1024MB of memory?
- Did I accidentally change the database name, and the data will be wiped out on deploy?

It allows us to ensure that our team doesn't accidentally change some infrastructure settings. It also allows you to enforce specific infrastructure policies across your app.

:::tip
Here are a couple of reference docs from AWS that should help you write stack tests.

- [CDK assertions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html)
- [CloudFormation resource definitions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html)

:::

---

## Tips

Now that you know how to test various parts of your app. Here are a couple of tips on writing effective tests.

---

### Don't test implementation details

In this chapter, we used DynamoDB as our database choice. We could've selected PostgreSQL and our tests would've remained the same.

Your tests should be unaware of things like what table data is being written, and instead just call domain functions to verify their input and output. This will minimize how often you need to rewrite your tests as the implementation details change.

---

### Isolate tests to run them in parallel

Tests need to be structured in a way that they can be run reliably in parallel. In our domain function and API tests above, we checked to see if the created article exists:

```ts
// Check the newly created article exists
expect(
  list.find((a) => a.articleID === article.createArticle.id)
).not.toBeNull();
```

Instead, if we had checked for the total article count, the test might fail if other tests were also creating articles.

```ts
expect(list.length).toBe(1);
```

The best way to isolate tests is to create separate scopes for each test. In our example, the articles are stored globally. If the articles were stored within a user's scope, you can create a new user per test. This way, tests can run in parallel without affecting each other.

---

## How `sst load-config` works

When testing your code, you have to ensure the testing environment has the same environment variable values as the Lambda environment. In the past, people would manually maintain a `.env.test` file with environment values. SST has built-in support for automatically loading the secrets and environment values that are managed by [`Config`](../environment-variables.md).

The [`sst load-config`](../packages/cli.md#load-config) CLI fetches all the `Config` values, [`Parameter`](constructs/Parameter.md) and [`Secret`](constructs/Secret.md), that are used in your app, and invokes the `vitest run` with the values configured as environment variables.

<details>
<summary>Behind the scenes</summary>

The `sst load-config` CLI sets the following environment variables:

- `SST_APP` with the name of your SST app
- `SST_STAGE` with the stage
- For Secrets, it fetches and decrypts all SSM Parameters prefixed with `/sst/{appName}/{stageName}/secrets/*` and `/sst/{appName}/.fallback/secrets/*`, and sets the corresponding environment variables prefixed with `SST_PARAM_*`.

  ie. `SST_PARAM_STRIPE_KEY` is created with value from `/sst/{appName}/{stageName}/secrets/STRIPE_KEY`

- For Parameters, it fetches all SSM Parameters prefixed with `/sst/{appName}/{stageName}/parameters/*`, and sets the environment variables prefixed with `SST_PARAM_*`.

  ie. `SST_PARAM_USER_UPDATED_TOPIC` is created with value from `/sst/{appName}/{stageName}/parameters/USER_UPDATED_TOPIC`

Secret values, `/sst/{appName}/{stageName}/secrets/STRIPE_KEY` are stored as Parameter environment variables `SST_PARAM_STRIPE_KEY`. This is intentional so that the [`@serverless-stack/node/config`](packages/node.md#config) helper doesn't need to re-fetch the secret values at runtime.

</details>

This allows the [`@serverless-stack/node/config`](packages/node.md#config) helper library to work as if it was running inside a Lambda function.
