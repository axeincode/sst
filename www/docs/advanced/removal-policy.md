---
title: Removal Policy
description: "Learn how to set the removal policy for resources in your SST app."
---

A Removal Policy controls what happens to the resource when it's being removed. This can happen in one of three situations:

1. The resource is removed from the Stack.
2. A change to the resource is made that requires it to be replaced.
3. The stack is deleted, so all resources in it are removed.

## Retained resources

Most of the resources are destroyed on remove, but some stateful resources that contain data are retained by default. These include:

- S3 buckets
- DynamoDB tables
- CloudWatch log groups

This default behavior is good for production environments. It allows you to recover the data when an environment is accidentally removed. However, for ephemeral (dev or feature branch) environments, it can be useful to destroy all the resources on deletion.

## Changing the removal policy

You can set the removal policy on all the resources in your SST app.

:::danger
Make sure to not set the default removal policy to `DESTROY` for production environments.
:::

```js title="stacks/index.js"
import { RemovalPolicy } from "aws-cdk-lib";

export default function main(app) {
  // Remove all resources when non-prod stages are removed
  if (app.stage !== "prod") {
    app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);
  }

  // Add stacks
}
```
