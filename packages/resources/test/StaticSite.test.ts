import {
  expect as expectCdk,
  countResources,
  haveResource,
  objectLike,
  stringLike,
  anything,
  ABSENT,
} from "@aws-cdk/assert";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as route53 from "@aws-cdk/aws-route53";
import * as cf from "@aws-cdk/aws-cloudfront";
import { App, Stack, StaticSite } from "../src";

///////////////////
// Test Constructor
///////////////////

test("constructor: no domain", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/site",
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.acmCertificate).toBeUndefined();
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Aliases: [],
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
        DefaultCacheBehavior: {
          CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          Compress: true,
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        DefaultRootObject: "index.html",
        Enabled: true,
        HttpVersion: "http2",
        IPV6Enabled: true,
        Origins: [
          {
            DomainName: {
              "Fn::GetAtt": ["SiteBucket978D4AEB", "RegionalDomainName"],
            },
            Id: "devmyappstackSiteDistributionOrigin1F25265FA",
            OriginPath: stringLike("/deploy-*"),
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
      SourceBucketName: anything(),
      SourceObjectKey: anything(),
      DistributionPaths: ["/*"],
      DestinationBucketName: {
        Ref: "SiteBucket978D4AEB",
      },
      DestinationBucketKeyPrefix: stringLike("deploy-*"),
      FileOptions: [],
      ReplaceValues: [],
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
  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: "domain.com",
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
  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
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

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: "domain.com",
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

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: {
      domainName: "domain.com",
    },
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

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
    },
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

test("customDomain: certificate imported", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
      certificate: new acm.Certificate(stack, "Cert", {
        domainName: "domain.com",
      }),
    },
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

test("constructor: buildCommand error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      buildCommand: "garbage command",
    });
  }).toThrow(/There was a problem building the "Site" StaticSite./);
});

test("constructor: fileOptions", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    fileOptions: [
      {
        exclude: "*",
        include: "*.html",
        cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
      },
      {
        exclude: "*",
        include: "*.js",
        cacheControl: "max-age=31536000,public,immutable",
      },
    ],
  });
  expectCdk(stack).to(
    haveResource("Custom::SSTBucketDeployment", {
      SourceBucketName: anything(),
      SourceObjectKey: anything(),
      DistributionPaths: ["/*"],
      DestinationBucketName: {
        Ref: "SiteBucket978D4AEB",
      },
      DestinationBucketKeyPrefix: stringLike("deploy-*"),
      FileOptions: [
        [
          "--exclude",
          "*",
          "--include",
          "*.html",
          "--cache-control",
          "max-age=0,no-cache,no-store,must-revalidate",
        ],
        [
          "--exclude",
          "*",
          "--include",
          "*.js",
          "--cache-control",
          "max-age=31536000,public,immutable",
        ],
      ],
      ReplaceValues: [],
    })
  );
});

test("constructor: fileOptions array value", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    fileOptions: [
      {
        exclude: "*",
        include: ["*.js", "*.css"],
        cacheControl: "max-age=31536000,public,immutable",
      },
    ],
  });
  expectCdk(stack).to(
    haveResource("Custom::SSTBucketDeployment", {
      SourceBucketName: anything(),
      SourceObjectKey: anything(),
      DistributionPaths: ["/*"],
      DestinationBucketName: {
        Ref: "SiteBucket978D4AEB",
      },
      DestinationBucketKeyPrefix: stringLike("deploy-*"),
      FileOptions: [
        [
          "--exclude",
          "*",
          "--include",
          "*.js",
          "--include",
          "*.css",
          "--cache-control",
          "max-age=31536000,public,immutable",
        ],
      ],
      ReplaceValues: [],
    })
  );
});

test("constructor: replaceValues", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    replaceValues: [
      {
        files: "*.js",
        search: "{{ API_URL }}",
        replace: "a",
      },
      {
        files: "*.html",
        search: "{{ COGNITO_ID }}",
        replace: "b",
      },
    ],
  });
  expectCdk(stack).to(
    haveResource("Custom::SSTBucketDeployment", {
      SourceBucketName: anything(),
      SourceObjectKey: anything(),
      DistributionPaths: ["/*"],
      DestinationBucketName: {
        Ref: "SiteBucket978D4AEB",
      },
      DestinationBucketKeyPrefix: stringLike("deploy-*"),
      FileOptions: [],
      ReplaceValues: [
        {
          files: "*.js",
          search: "{{ API_URL }}",
          replace: "a",
        },
        {
          files: "*.html",
          search: "{{ COGNITO_ID }}",
          replace: "b",
        },
      ],
    })
  );
});

test("constructor: s3Bucket props", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    s3Bucket: {
      bucketName: "my-bucket",
    },
  });
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(
    haveResource("AWS::S3::Bucket", {
      BucketName: "my-bucket",
    })
  );
});

test("constructor: s3Bucket websiteIndexDocument", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      s3Bucket: {
        websiteIndexDocument: "index.html",
      },
    });
  }).toThrow(/Do not configure the "s3Bucket.websiteIndexDocument"./);
});

test("constructor: s3Bucket websiteErrorDocument", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      s3Bucket: {
        websiteErrorDocument: "error.html",
      },
    });
  }).toThrow(/Do not configure the "s3Bucket.websiteErrorDocument"./);
});

test("constructor: cfDistribution props", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    cfDistribution: {
      comment: "My Comment",
    },
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

test("constructor: cfDistribution props override", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    cfDistribution: {
      errorResponses: [
        {
          httpStatus: 403,
          responsePagePath: `/new.html`,
          responseHttpStatus: 200,
        },
      ],
    },
  });
  expectCdk(stack).to(countResources("AWS::CloudFront::Distribution", 1));
  expectCdk(stack).to(
    haveResource("AWS::CloudFront::Distribution", {
      DistributionConfig: objectLike({
        CustomErrorResponses: [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: "/new.html",
          },
        ],
      }),
    })
  );
});

test("constructor: cfDistribution defaultBehavior override", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    cfDistribution: {
      defaultBehavior: {
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
      },
    },
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

test("constructor: cfDistribution certificate", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      cfDistribution: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    });
  }).toThrow(/Do not configure the "cfDistribution.certificate"./);
});

test("constructor: cfDistribution domainNames", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      cfDistribution: {
        domainNames: ["domain.com"],
      },
    });
  }).toThrow(/Do not configure the "cfDistribution.domainNames"./);
});

///////////////////
// Test Constructor: skipBuild
///////////////////

test("constructor: skipBuild", async () => {
  const app = new App({
    skipBuild: true,
  });
  const stack = new Stack(app, "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
  });
  expectCdk(stack).to(countResources("Custom::SSTBucketDeployment", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTBucketDeployment", {
      SourceBucketName: ABSENT,
      SourceObjectKey: ABSENT,
    })
  );
});
