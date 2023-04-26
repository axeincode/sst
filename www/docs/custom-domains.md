---
title: Custom Domains
description: Learn how to set a custom domain for your frontend or API in your SST app.
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Setting custom domains for your frontend or API in SST.

</HeadlineText>

---

## Overview

The easiest way to set a custom domain in SST is by having your domains hosted in [Route 53](https://aws.amazon.com/route53/). Simply set the `customDomain` prop:

- For your [frontend](constructs/NextjsSite.md#customdomain)

  ```ts {2}
  new NextjsSite(stack, "site", {
    customDomain: "my-app.com",
  });
  ```

- Or [API](constructs/Api.md#customdomain)

  ```ts {2}
  new Api(stack, "api", {
    customDomain: "api.my-app.com",
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
    },
  });
  ```

This will set the domain and configure SSL automatically. Including redirecting `http://` to `https://`.

If your domains are hosted elsewhere, [check out the section below](#externally-hosted-domains).

---

## Redirect www

For root domains, people prefer to redirect `www.my-app.com` to `my-app.com`. You can configure this by setting a `domainAlias`.

```ts {4}
new NextjsSite(stack, "site", {
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

---

## Domains across stages

You might want to configure custom domains just for your production environments.

```ts {2}
new NextjsSite(stack, "site", {
  customDomain: stack.stage === "prod" ? "my-app.com" : undefined,
});
```

Or give each stage its own subdomain.

```ts {3}
new NextjsSite(stack, "site", {
  customDomain:
    stack.stage === "prod" ? "my-app.com" : `${stack.stage}.my-app.com`,
});
```

Where the `stage` is the name you pass into `sst deploy --stage $STAGE`.

---

## Externally hosted domains

Your domains might not be hosted on Route 53. In this case you could transfer your domain to Route 53. Or if you want to keep it at your original provider, you have a couple of options.

---

### Migrate DNS to Route 53

The simpler approach is moving the DNS service from your current provider to Route 53. AWS has a couple of docs on this.

1. [Making Route 53 the DNS service for a domain that's in use](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/migrate-dns-domain-in-use.html) — this is for cases where the domain is currently receiving a lot of traffic.
2. [Making Route 53 the DNS service for an inactive domain](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/migrate-dns-domain-inactive.html) — this is for cases where the domain is not in use or is not receiving much traffic.

Once completed, you can follow the steps above to set your custom domains.

---

### Point the CNAME to CloudFront

The alternative approach is to create a CNAME record in your existing provider and point it to the CloudFront distribution. This is the auto-generated URL that you get when you deploy your frontend or API, `d111111abcdef8.cloudfront.net`.

:::info
You cannot point a CNAME to a root domain. For example, you can point it to `www.my-app.com` but not `my-app.com`. You'll need to migrate your DNS to Route 53 for that.
:::

To point the CNAME, you need to:

1. Create a certificate in the `us-east-1` region for the domain you want. This is required by CloudFront. You'll need to verify that you own the domain.

2. Get the ARN of the certificate and set it in your construct, `certArn`.

   ```ts {6-9}
   import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

   new NextjsSite(stack, "site", {
     customDomain: {
       domainName: "www.my-app.com",
       isExternalDomain: true,
       cdk: {
         certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
       },
     },
   });
   ```

3. Deploy your app and get the CloudFront distribution URL.

4. Set the CNAME to the CloudFront distribution in your external domain provider.

You can [read more about this over on the AWS docs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html).

---

## Advanced

You can further configure how your custom domains are set.

---

### Alternate domain names

In addition to your custom domain, you can specify additional domain names.

Note that the certificate for these names will not be automatically generated, so the certificate prop must be specified. Also note that you need to manually create the Route 53 records for alternate domain names.

```ts
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";

// Look up hosted zone
const hostedZone = route53.HostedZone.fromLookup(stack, "HostedZone", {
  domainName: "my-app.com",
});

// Create a certificate with alternate domain names
const certificate = new acm.DnsValidatedCertificate(stack, "Certificate", {
  domainName: "foo.my-app.com",
  hostedZone,
  // The certificates need to be created in us-east-1
  region: "us-east-1",
  subjectAlternativeNames: ["bar.my-app.com"],
});

// Create site
const site = new NextjsSite(stack, "site", {
  customDomain: {
    domainName: "foo.my-app.com",
    alternateNames: ["bar.my-app.com"],
    cdk: {
      hostedZone,
      certificate,
    },
  },
});

// Create A and AAAA records for the alternate domain names
const recordProps = {
  recordName: "bar.my-app.com",
  zone: hostedZone,
  target: route53.RecordTarget.fromAlias(
    new route53Targets.CloudFrontTarget(site.cdk.distribution)
  ),
};
new route53.ARecord(stack, "AlternateARecord", recordProps);
new route53.AaaaRecord(stack, "AlternateAAAARecord", recordProps);
```

---

### Importing a certificate

You can import existing certificates to use with your custom domain.

:::note
The certificate needs be created in the `us-east-1` (N. Virginia) region as required by CloudFront.
:::

```js {7}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new NextjsSite(stack, "site", {
  customDomain: {
    domainName: "my-app.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

Here `certArn` is the ARN of the certificate.
