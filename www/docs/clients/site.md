---
description: "Overview of the `site` module."
---

Overview of the `site` module in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/site"
```

The `site` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### StaticSite

This module helps with accessing [`StaticSite`](../constructs/StaticSite.md) constructs.

```ts
import { StaticSite } from "@serverless-stack/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(StaticSite.myWeb.url);
```

---

### ViteStaticSite

This module helps with accessing [`ViteStaticSite`](../constructs/ViteStaticSite.md) constructs.

```ts
import { ViteStaticSite } from "@serverless-stack/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(ViteStaticSite.myWeb.url);
```

---

### ReactStaticSite

This module helps with accessing [`ReactStaticSite`](../constructs/ReactStaticSite.md) constructs.

```ts
import { ReactStaticSite } from "@serverless-stack/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(ReactStaticSite.myWeb.url);
```

---

### NextjsSite

This module helps with accessing [`NextjsSite`](../constructs/NextjsSite.md) constructs.

```ts
import { NextjsSite } from "@serverless-stack/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(NextjsSite.myWeb.url);
```

---

### RemixSite

This module helps with accessing [`RemixSite`](../constructs/RemixSite.md) constructs.

```ts
import { RemixSite } from "@serverless-stack/node/site";
```

#### url

_Type_ : <span class="mono">string</span>

The URL of the site. If custom domain is enabled, this is the custom domain URL of the site.

```ts
console.log(RemixSite.myWeb.url);
```
