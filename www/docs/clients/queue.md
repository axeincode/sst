---
description: "Overview of the `queue` module."
---

Overview of the `queue` module in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/queue"
```

The `queue` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Queue

This module helps with accessing [`Queue`](../constructs/Queue.md) constructs.

```ts
import { Queue } from "@serverless-stack/node/queue";
```

#### queueUrl

_Type_ : <span class="mono">string</span>

The URL of the SQS queue.

```ts
console.log(Queue.myQueue.queueUrl);
```
