---
id: known-issues
title: Known Issues
description: "Known issues with AWS CDK and Serverless Stack (SST)"
---

There is a known issue in AWS CDK when using mismatched versions of their NPM packages. This means that all your AWS CDK packages in your `package.json` should use the same exact version. And since SST uses AWS CDK internally, this means that your app needs to use the same versions as well.

To help with this, SST will show a message to let you know if you might potentially run into this issue. And help you fix it.

```bash
Mismatched versions of AWS CDK packages. Serverless Stack currently supports 1.55.0. Fix using:

  npm install @aws-cdk/aws-cognito@1.55.0 --save-exact
```

We also created a convenience method to help install the CDK npm packages with the right version — [`sst add-cdk`](packages/cli.md#add-cdk-packages).

So instead of:

```bash
npm install @aws-cdk/aws-s3 @aws-cdk/aws-iam
```

You can do:

```bash
npx sst add-cdk @aws-cdk/aws-s3 @aws-cdk/aws-iam
```

And it'll install those packages using the right CDK versions.

You can learn more about these issues [here](https://github.com/aws/aws-cdk/issues/9578) and [here](https://github.com/aws/aws-cdk/issues/542).
