### Configuring notifications

#### Using the minimal config

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(this, "Bucket", {
  notifications: ["src/notification.main"],
});
```

Or configuring the notification events.

```js {y}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification.main",
      events: ["object_created"],
    },
  ],
});
```

#### Lazily adding notifications

Create an _empty_ bucket and lazily add the notifications.

```js {3}
const bucket = new Bucket(this, "Bucket");

bucket.addNotifications(this, ["src/notification.main"]);
```

### Configuring Function notifications

#### Specifying function props for all the notifications

You can extend the minimal config, to set some function props and have them apply to all the notifications.

```js {3-7}
new Bucket(this, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  notifications: [
    {
      function: "src/notification1.main",
      events: ["object_created"],
    },
    {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  ],
});
```

#### Configuring an individual notification

Configure each Lambda function separately.

```js
new Bucket(this, "Bucket", {
  notifications: [
    {
      function: {
        srcPath: "src/",
        handler: "notification.main",
        environment: { tableName: table.tableName },
        permissions: [table],
      },
      events: ["object_created"],
    },
  ],
});
```

Note that, you can set the `defaults.function` while using the `function` per notification. The `function` will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Bucket(this, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  notifications: [
    {
      function: {
        handler: "src/notification1.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
      events: ["object_created"],
    },
    {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  ],
});
```

So in the above example, the `notification1` function doesn't use the `timeout` that is set in the `defaults.function`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Giving the notifications some permissions

Allow the notification functions to access S3.

```js {16}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      events: ["object_created"],
    },
    {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  ],
});

bucket.attachPermissions(["s3"]);
```

#### Giving a specific notification some permissions

Allow the first notification function to access S3.

```js {16}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      events: ["object_created"],
    },
    {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  ],
});

bucket.attachPermissionsToNotification(0, ["s3"]);
```

### Configuring Queue notifications

#### Specifying the Queue directly

You can directly pass in an instance of the [Queue](Queue.md) construct.

```js {6}
import { Queue } from "@serverless-stack/resources";

const myQueue = new Queue(this, "MyQueue");

new Bucket(this, "Bucket", {
  notifications: [myQueue],
});
```

#### Configuring the notification

```js {5-9}
const myQueue = new Queue(this, "MyQueue");

new Bucket(this, "Bucket", {
  notifications: [
    {
      queue: myQueue,
      events: ["object_created_put"],
      filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
    }
  ],
});
```

### Configuring Topic notifications

#### Specifying the Topic directly

You can directly pass in an instance of the [Topic](Topic.md) construct.

```js {6}
import { Topic } from "@serverless-stack/resources";

const myTopic = new Topic(this, "MyTopic");

new Bucket(this, "Bucket", {
  notifications: [myTopic],
});
```

#### Configuring the notification

```js {5-9}
const myTopic = new Topic(this, "MyTopic");

new Bucket(this, "Bucket", {
  notifications: [
    {
      topic: myTopic,
      events: ["object_created_put"],
      filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
    }
  ],
});
```

### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {3-5}
new Bucket(this, "Bucket", {
  cdk: {
    bucket: {
      bucketName: "my-bucket",
    },
  },
});
```

### Removing the S3 Bucket

Only empty S3 buckets can be deleted. However, you can configure the bucket to automatically delete all objects upon removal.

```js {5-8}
import * as cdk from "aws-cdk-lib";

new Bucket(this, "Bucket", {
  cdk: {
    bucket: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
  },
});
```
