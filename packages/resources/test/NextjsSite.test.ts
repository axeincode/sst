import * as path from "path";
import * as fs from "fs-extra";
import { execSync } from "child_process";
import {
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
  objectLike,
  stringLike,
  arrayWith,
  anything,
} from "@aws-cdk/assert";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as route53 from "@aws-cdk/aws-route53";
import * as acm from "@aws-cdk/aws-certificatemanager";
import { App, Stack, NextjsSite } from "../src";

const sitePath = "test/nextjs-site";
const sitePathMinimalFeatures = "test/nextjs-site-minimal-features";
const buildOutputPath = path.join(".build", "nextjs-output");

beforeAll(async () => {
  // Instal Next.js app dependencies
  execSync("npm install", {
    cwd: sitePath,
    stdio: "inherit",
  });
  execSync("npm install", {
    cwd: sitePathMinimalFeatures,
    stdio: "inherit",
  });

  // Build Next.js app
  fs.removeSync(path.join(__dirname, "..", buildOutputPath));
  const configBuffer = Buffer.from(
    JSON.stringify({
      cwd: path.join(__dirname, "..", sitePath),
      args: ["build"],
    })
  );
  const cmd = [
    "node",
    path.join(__dirname, "../assets/NextjsSite/build.js"),
    "--path",
    path.join(__dirname, "..", sitePath),
    "--output",
    path.join(__dirname, "..", buildOutputPath),
    "--config",
    configBuffer.toString("base64"),
  ].join(" ");
  execSync(cmd, {
    cwd: path.join(__dirname, "..", sitePath),
    stdio: "inherit",
  });
});

/////////////////////////////
// Test Constructor
/////////////////////////////

test("constructor: no domain", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.acmCertificate).toBeUndefined();
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 10));
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: [],
        CacheBehaviors: [
          {
            AllowedMethods: [
              "GET",
              "HEAD",
              "OPTIONS",
              "PUT",
              "PATCH",
              "POST",
              "DELETE",
            ],
            CachePolicyId: {
              Ref: "SiteImageCache3A336C80",
            },
            CachedMethods: ["GET", "HEAD", "OPTIONS"],
            Compress: true,
            LambdaFunctionAssociations: [
              {
                EventType: "origin-request",
                LambdaFunctionARN: anything(),
              },
            ],
            OriginRequestPolicyId: {
              Ref: "SiteImageOriginRequestFA9A64F5",
            },
            PathPattern: "_next/image*",
            TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
            ViewerProtocolPolicy: "redirect-to-https",
          },
          {
            AllowedMethods: ["GET", "HEAD", "OPTIONS"],
            CachePolicyId: {
              Ref: "SiteLambdaCacheD9743183",
            },
            CachedMethods: ["GET", "HEAD", "OPTIONS"],
            Compress: true,
            LambdaFunctionAssociations: [
              {
                EventType: "origin-request",
                IncludeBody: true,
                LambdaFunctionARN: anything(),
              },
              {
                EventType: "origin-response",
                LambdaFunctionARN: anything(),
              },
            ],
            PathPattern: "_next/data/*",
            TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
            ViewerProtocolPolicy: "redirect-to-https",
          },
          {
            AllowedMethods: ["GET", "HEAD", "OPTIONS"],
            CachePolicyId: {
              Ref: "SiteStaticsCache29AFAE7C",
            },
            CachedMethods: ["GET", "HEAD", "OPTIONS"],
            Compress: true,
            PathPattern: "_next/*",
            TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
            ViewerProtocolPolicy: "redirect-to-https",
          },
          {
            AllowedMethods: ["GET", "HEAD", "OPTIONS"],
            CachePolicyId: {
              Ref: "SiteStaticsCache29AFAE7C",
            },
            CachedMethods: ["GET", "HEAD", "OPTIONS"],
            Compress: true,
            PathPattern: "static/*",
            TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
            ViewerProtocolPolicy: "redirect-to-https",
          },
          {
            AllowedMethods: [
              "GET",
              "HEAD",
              "OPTIONS",
              "PUT",
              "PATCH",
              "POST",
              "DELETE",
            ],
            CachePolicyId: {
              Ref: "SiteLambdaCacheD9743183",
            },
            CachedMethods: ["GET", "HEAD", "OPTIONS"],
            Compress: true,
            LambdaFunctionAssociations: [
              {
                EventType: "origin-request",
                IncludeBody: true,
                LambdaFunctionARN: anything(),
              },
            ],
            PathPattern: "api/*",
            TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
            ViewerProtocolPolicy: "redirect-to-https",
          },
        ],
        DefaultCacheBehavior: {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteLambdaCacheD9743183",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          LambdaFunctionAssociations: [
            {
              EventType: "origin-request",
              IncludeBody: true,
              LambdaFunctionARN: anything(),
            },
            {
              EventType: "origin-response",
              LambdaFunctionARN: anything(),
            },
          ],
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        DefaultRootObject: "",
        Enabled: true,
        HttpVersion: "http2",
        IPV6Enabled: true,
        Origins: [
          {
            DomainName: {
              "Fn::GetAtt": ["SiteBucket978D4AEB", "RegionalDomainName"],
            },
            Id: "devmyappstackSiteDistributionOrigin1F25265FA",
            OriginPath: anything(),
            S3OriginConfig: {
              OriginAccessIdentity: {
                "Fn::Join": [
                  "",
                  [
                    "origin-access-identity/cloudfront/",
                    {
                      Ref: "SiteDistributionOrigin1S3Origin76FD4338",
                    },
                  ],
                ],
              },
            },
          },
        ],
      },
    })
  );
  expectCdk(stack).to(countResources("AWS::Route53::RecordSet", 0));
  expectCdk(stack).to(countResources("AWS::Route53::HostedZone", 0));
  expectCdk(stack).to(countResources("Custom::SSTBucketDeployment", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTBucketDeployment", {
      Sources: [
        {
          BucketName: anything(),
          ObjectKey: anything(),
        },
      ],
      DestinationBucketName: {
        Ref: "SiteBucket978D4AEB",
      },
      DestinationBucketKeyPrefix: stringLike("deploy-*"),
      FileOptions: [
        [
          "--exclude",
          "*",
          "--include",
          "public/*",
          "--cache-control",
          "public,max-age=31536000,must-revalidate",
        ],
        [
          "--exclude",
          "*",
          "--include",
          "static/*",
          "--cache-control",
          "public,max-age=31536000,must-revalidate",
        ],
        [
          "--exclude",
          "*",
          "--include",
          "static-pages/*",
          "--cache-control",
          "public,max-age=0,s-maxage=2678400,must-revalidate",
        ],
        [
          "--exclude",
          "*",
          "--include",
          "_next/data/*",
          "--cache-control",
          "public,max-age=0,s-maxage=2678400,must-revalidate",
        ],
        [
          "--exclude",
          "*",
          "--include",
          "_next/static/*",
          "--cache-control",
          "public,max-age=31536000,immutable",
        ],
      ],
      ReplaceValues: [],
    })
  );
  expectCdk(stack).to(countResources("Custom::SSTCloudFrontInvalidation", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTCloudFrontInvalidation", {
      DistributionPaths: ["/*"],
    })
  );
});

test("constructor: with domain", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: "domain.com",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.acmCertificate).toBeDefined();
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: objectLike({
        Aliases: ["domain.com"],
      }),
    })
  );
  expectCdk(stack).to(countResources("AWS::Route53::RecordSet", 1));
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "domain.com.",
      Type: "A",
      AliasTarget: {
        DNSName: {
          "Fn::GetAtt": ["SiteDistribution390DED28", "DomainName"],
        },
        HostedZoneId: {
          "Fn::FindInMap": [
            "AWSCloudFrontPartitionHostedZoneIdMap",
            {
              Ref: "AWS::Partition",
            },
            "zoneId",
          ],
        },
      },
      HostedZoneId: {
        Ref: "SiteHostedZone0E1602DC",
      },
    })
  );
  expectCdk(stack).to(countResources("AWS::Route53::HostedZone", 1));
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("constructor: with domain with alias", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-nextjs-site",
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.acmCertificate).toBeDefined();
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 2));
  expectCdk(stack).to(
    haveResource("AWS::S3::Bucket", {
      WebsiteConfiguration: {
        RedirectAllRequestsTo: {
          HostName: "domain.com",
          Protocol: "https",
        },
      },
    })
  );
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 2));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: objectLike({
        Aliases: ["www.domain.com"],
      }),
    })
  );
  expectCdk(stack).to(countResources("AWS::Route53::RecordSet", 3));
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "www.domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "www.domain.com.",
      Type: "AAAA",
    })
  );
  expectCdk(stack).to(countResources("AWS::Route53::HostedZone", 1));
});

test("customDomain: string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: "domain.com",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://domain.com");
  expectCdk(stack).to(
    haveResource("AWS::CloudFormation::CustomResource", {
      DomainName: "domain.com",
      Region: "us-east-1",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain: domainName string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "domain.com",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://domain.com");
  expectCdk(stack).to(
    haveResource("AWS::CloudFormation::CustomResource", {
      DomainName: "domain.com",
      Region: "us-east-1",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain: hostedZone string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  expectCdk(stack).to(
    haveResource("AWS::CloudFormation::CustomResource", {
      DomainName: "www.domain.com",
      Region: "us-east-1",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "www.domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain: hostedZone construct", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: route53.HostedZone.fromLookup(stack, "HostedZone", {
        domainName: "domain.com",
      }),
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(route53.HostedZone.fromLookup).toHaveBeenCalledTimes(1);
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  expectCdk(stack).to(
    haveResource("AWS::CloudFormation::CustomResource", {
      DomainName: "www.domain.com",
      Region: "us-east-1",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "www.domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain: certificate imported", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
      certificate: new acm.Certificate(stack, "Cert", {
        domainName: "domain.com",
      }),
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  expectCdk(stack).to(countResources("AWS::CloudFormation::CustomResource", 0));
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "www.domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain: isExternalDomain true", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      certificate: new acm.Certificate(stack, "Cert", {
        domainName: "domain.com",
      }),
      isExternalDomain: true,
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: objectLike({
        Aliases: ["www.domain.com"],
      }),
    })
  );
  expectCdk(stack).to(countResources("AWS::CloudFormation::CustomResource", 0));
  expectCdk(stack).to(countResources("AWS::Route53::HostedZone", 0));
  expectCdk(stack).to(countResources("AWS::Route53::RecordSet", 0));
});

test("customDomain: isExternalDomain true and no certificate", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "jestBuildOutputPath" not exposed in props
      jestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain true and domainAlias set", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      customDomain: {
        domainName: "domain.com",
        domainAlias: "www.domain.com",
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
        isExternalDomain: true,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "jestBuildOutputPath" not exposed in props
      jestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(
    /Domain alias is only supported for domains hosted on Amazon Route 53/
  );
});

test("customDomain: isExternalDomain true and hostedZone set", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      customDomain: {
        domainName: "www.domain.com",
        hostedZone: "domain.com",
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
        isExternalDomain: true,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "jestBuildOutputPath" not exposed in props
      jestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("constructor: path not exist", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "does-not-exist",
    });
  }).toThrow(/No path found/);
});

test("constructor: skipbuild doesn't expect path", async () => {
  const stack = new Stack(
    new App({
      skipBuild: true,
    }),
    "stack"
  );
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "does-not-exist",
    });
  }).not.toThrow(/No path found/);
});

test("constructor: s3Bucket props", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    s3Bucket: {
      bucketName: "my-bucket",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(
    haveResource("AWS::S3::Bucket", {
      BucketName: "my-bucket",
    })
  );
});

test("constructor: cfDistribution props", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cfDistribution: {
      comment: "My Comment",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: objectLike({
        Comment: "My Comment",
      }),
    })
  );
});

test("constructor: cfDistribution defaultBehavior override", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cfDistribution: {
      defaultBehavior: {
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: objectLike({
        DefaultCacheBehavior: objectLike({
          ViewerProtocolPolicy: "https-only",
          AllowedMethods: [
            "GET",
            "HEAD",
            "OPTIONS",
            "PUT",
            "PATCH",
            "POST",
            "DELETE",
          ],
        }),
      }),
    })
  );
});

test("constructor: cfDistribution certificate conflict", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      cfDistribution: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "jestBuildOutputPath" not exposed in props
      jestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(/Do not configure the "cfDistribution.certificate"/);
});

test("constructor: cfDistribution domainNames conflict", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      cfDistribution: {
        domainNames: ["domain.com"],
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "jestBuildOutputPath" not exposed in props
      jestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(/Do not configure the "cfDistribution.domainNames"/);
});

test("constructor: environment generates placeholders", async () => {
  // Note: Build for real, do not use jestBuildOutputPath

  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    environment: {
      API_URL: "my-url",
    },
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: "site.buildOutDir" not exposed in props
  const buildOutDir = site.buildOutDir || "";
  const buildId = fs
    .readFileSync(path.join(buildOutDir, "assets", "BUILD_ID"))
    .toString()
    .trim();
  const html = fs.readFileSync(
    path.join(buildOutDir, "assets", "static-pages", buildId, "env.html")
  );
  expect(html.toString().indexOf("{{ API_URL }}") > -1).toBeTruthy();

  expectCdk(stack).to(
    haveResource("Custom::SSTBucketDeployment", {
      ReplaceValues: [
        {
          files: "**/*.html",
          search: "{{ API_URL }}",
          replace: "my-url",
        },
        {
          files: "**/*.js",
          search: "{{ API_URL }}",
          replace: "my-url",
        },
        {
          files: "**/*.json",
          search: "{{ API_URL }}",
          replace: "my-url",
        },
      ],
    })
  );

  expectCdk(stack).to(
    countResourcesLike("Custom::SSTLambdaCodeUpdater", 4, {
      ReplaceValues: [
        {
          files: "**/*.html",
          search: "{{ API_URL }}",
          replace: "my-url",
        },
        {
          files: "**/*.js",
          search: "{{ API_URL }}",
          replace: "my-url",
        },
        {
          files: "**/*.json",
          search: "{{ API_URL }}",
          replace: "my-url",
        },
        {
          files: "**/*.js",
          search: '"{{ _SST_NEXTJS_SITE_ENVIRONMENT_ }}"',
          replace: '{"API_URL":"my-url"}',
        },
      ],
    })
  );
});

test("constructor: minimal feature (empty api lambda)", async () => {
  // Note: Build for real, do not use jestBuildOutputPath

  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: sitePathMinimalFeatures,
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: "site.buildOutDir" not exposed in props
  const buildOutDir = site.buildOutDir || "";

  // Verify "image-lambda" and "api-lambda" do not exist
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "default-lambda", "index.js"))
  ).toBeTruthy();
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "regeneration-lambda", "index.js"))
  ).toBeTruthy();
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "image-lambda", "index.js"))
  ).toBeFalsy();
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "api-lambda", "index.js"))
  ).toBeFalsy();
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 10));
});

/////////////////////////////
// Test Constructor for non-us-east-1 region
/////////////////////////////

test("constructor: us-east-1", async () => {
  const app = new App({ region: "us-east-1" });
  const stack = new Stack(app, "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.acmCertificate).toBeUndefined();
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 10));
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(countResources("Custom::SSTEdgeLambdaBucket", 0));
  expectCdk(stack).to(countResources("Custom::SSTEdgeLambda", 0));
  expectCdk(stack).to(countResources("Custom::SSTEdgeLambdaVersion", 0));
  expectCdk(stack).to(countResources("Custom::SSTBucketDeployment", 1));
  expectCdk(stack).to(countResources("Custom::SSTLambdaCodeUpdater", 4));
  expectCdk(stack).to(countResources("Custom::SSTCloudFrontInvalidation", 1));
});

test("constructor: ca-central-1", async () => {
  const app = new App({ region: "ca-central-1" });
  const stack = new Stack(app, "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.acmCertificate).toBeUndefined();
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 9));
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(countResources("Custom::SSTEdgeLambdaBucket", 1));
  expectCdk(stack).to(countResources("Custom::SSTEdgeLambda", 3));
  expectCdk(stack).to(countResources("Custom::SSTEdgeLambdaVersion", 3));
  expectCdk(stack).to(countResources("Custom::SSTBucketDeployment", 1));
  expectCdk(stack).to(countResources("Custom::SSTLambdaCodeUpdater", 4));
  expectCdk(stack).to(countResources("Custom::SSTCloudFrontInvalidation", 1));
});

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: local debug", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
  });
  expectCdk(stack).to(countResources("Custom::SSTBucketDeployment", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTBucketDeployment", {
      Sources: [
        {
          BucketName: anything(),
          ObjectKey: anything(),
        },
      ],
      DestinationBucketName: {
        Ref: "SiteBucket978D4AEB",
      },
      DestinationBucketKeyPrefix: "deploy-live",
    })
  );
  expectCdk(stack).to(countResources("Custom::SSTCloudFrontInvalidation", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTCloudFrontInvalidation", {
      DistributionPaths: ["/*"],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: objectLike({
        CustomErrorResponses: [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: "/index.html",
          },
          {
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: "/index.html",
          },
        ],
      }),
    })
  );
});

/////////////////////////////
// Test Constructor for skipBuild
/////////////////////////////

test("constructor: skipBuild", async () => {
  const app = new App({
    skipBuild: true,
  });
  const stack = new Stack(app, "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
  });
  expectCdk(stack).to(countResources("Custom::SSTBucketDeployment", 1));
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "jestBuildOutputPath" not exposed in props
    jestBuildOutputPath: buildOutputPath,
  });
  site.attachPermissions(["sns"]);
  expectCdk(stack).to(
    countResourcesLike("AWS::IAM::Policy", 1, {
      PolicyDocument: {
        Statement: arrayWith({
          Action: "sns:*",
          Effect: "Allow",
          Resource: "*",
        }),
        Version: "2012-10-17",
      },
    })
  );
});
