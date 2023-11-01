---
title: Configuring SST
description: "Learn more about the sst.config.ts file."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST is configured using a TypeScript config file — `sst.config.ts`

</HeadlineText>

---

## File structure

The `sst.config.ts` file is placed at the root of your application, typically in the top most directory in your repo.

While it's defined as a TypeScript file, it should **not** be treated as a subpackage in a monorepo setup. It is a root level config used for managing your entire application.

---

## Basic config

Here's what a minimal config looks like.

```ts title="sst.config.ts"
import type { SSTConfig } from "sst";

export default {
  config(input) {
    return {
      name: "myapp",
      region: "us-east-1",
    };
  },
  stacks(app) {},
} satisfies SSTConfig;
```

It takes a `config` and a `stacks` function. While the `SSTConfig` type provides typesafety for the configuration object.

---

## Config function

The `config` function receives a global input object — this may contain any settings the user passes through the [CLI options](packages/sst.md#global-options). These may include:

- **`stage`** Stage to use
- **`region`** AWS region to use
- **`profile`** AWS profile to use
- **`role`** AWS role to assume for calls to AWS

These fields will only have values if the user explicitly passes them through the CLI options. You can use these flags to implement any kind of logic to run before returning a configuration.

For example, you can use a different profile based on what stage is being used.

```ts
config(input) {
  return {
    name: "myapp",
    profile: input.stage === "production"
      ? "myapp-production"
      : "myapp-dev"
  }
},
```

---

#### Config options

Here's the full list of config options that can be returned:

- **`name`** The name of your application
- **`stage`** The stage to use\*
- **`region`** AWS region to use\*
- **`profile`** AWS profile to use\*
- **`role`** AWS role to use\*
- **`ssmPrefix`** SSM prefix for all SSM parameters that SST creates
- **`advanced`**
  - **`disableParameterizedStackNameCheck`** Disable the check for stack names to be parameterized with the stage name.
  - **`disableAppModeCheck`** Disables the confirmation prompt when switching between `sst deploy` and `sst dev` deployment modes. If set to `true`, the prompt will be suppressed when changing modes.
- **`bootstrap`**
  - **`bucketName`** The name to use for the SST bootstrap bucket
  - **`stackName`** The name to use for the SST bootstrap stack
  - **`tags`** Tags to use for the SST bootstrap stack
  - **`useCdkBucket`** Use the S3 bucket created by the CDK bootstrap process instead of creating a new one
- **`cdk`**
  - **`bootstrapStackVersionSsmParameter`** The name of the SSM parameter which describes the bootstrap stack version number
  - **`cloudFormationExecutionRole`** IAM role assumed by the CloudFormation to deploy
  - **`customPermissionsBoundary`** The name of the IAM permissions boundary policy to use for the CDK toolkit stack and SST bootstrap stack
  - **`deployRoleArn`**: IAM role used to initiate a deployment
  - **`fileAssetPublishingRoleArn`** IAM role used to publish file assets to the S3 bucket
  - **`fileAssetsBucketName`** The name of the CDK toolkit bucket
  - **`imageAssetPublishingRoleArn`** IAM role used to publish image assets to the ECR repository
  - **`imageAssetsRepositoryName`** The name of the ECR repository for Docker image assets
  - **`lookupRoleArn`** IAM role used to look up values from the AWS account
  - **`pathMetadata`** Add CDK path metadata to templates. This enables the CDK Construct tree view in the CloudFormation console. Default `false`.
  - **`publicAccessBlockConfiguration`** Block public access configuration on the CDK toolkit bucket and SST bootstrap bucket
  - **`qualifier`** The qualifier for the CDK toolkit stack
  - **`toolkitStackName`** The name of the CDK toolkit stack

\*These won't take effect if the CLI flag for it is specified.

---

## Stacks function

The `stacks` function is the entry point for your SST application. This is where you can specify the stacks that contain the resources that you want to deploy.

You can either do this inline, like so.

```ts
stacks(app) {
  app.stack(function MyStack({ stack } ) {
    new Bucket(stack, "public")
  })
}
```

Where `Bucket` is from `import { Bucket } from "sst/constructs"`.

Or you can organize them as separate files.

```ts title="sst.config.ts"
stacks(app) {
  app
    .stack(MyStack)
    .stack(MyOtherStack)
}
```

Where you might place your stacks code in a separate directory.

```ts
import { MyStack } from "./stacks/my-stack";
import { MyOtherStack } from "./stacks/my-other-stack";
```

Again as noted above, these aren't meant to be a subpackage in your monorepo. The `stacks/` directory in this example is just a convenient way to organize your files.
