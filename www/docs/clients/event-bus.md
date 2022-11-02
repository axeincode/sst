---
description: "Overview of the `event-bus` module."
---

Overview of the `event-bus` module in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/event-bus"
```

The `event-bus` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### EventBus

This module helps with accessing [`EventBus`](../constructs/EventBus.md) constructs.

```ts
import { EventBus } from "@serverless-stack/node/event-bus";
```

#### eventBusName

_Type_ : <span class="mono">string</span>

The name of the EventBridge event bus.

```ts
console.log(EventBus.myBus.eventBusName);
```
