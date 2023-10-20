---
sidebar_label: Next.js
title: Use Next.js with SST
description: "Create and deploy a Next.js app to AWS with SST and OpenNext."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Create and deploy a Next.js app to AWS with SST and [OpenNext](https://open-next.js.org).

</HeadlineText>

---

## Prerequisites

You'll need at least [Node.js 18](https://nodejs.org/) and [npm 7](https://www.npmjs.com/). You also need to have an AWS account and [**AWS credentials configured locally**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new Next.js app.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-next-app@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create next-app
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create next-app
```

</TabItem>
</MultiPackagerCode>

Now initialize SST in the root of your new Next.js project.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd my-app
npx create-sst@latest
```

</TabItem>
<TabItem value="yarn">

```bash
cd my-app
yarn create sst
```

</TabItem>
<TabItem value="pnpm">

```bash
cd my-app
pnpm create sst
```

</TabItem>
</MultiPackagerCode>

:::tip Ready to deploy
Your Next.js app is now ready to be deployed to AWS! Just run — `npx sst deploy`. But let's take a second to look at how SST makes it easy to add other features to your app.
:::

Start your local dev environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst dev
```

</TabItem>
</MultiPackagerCode>

---

#### Start Next.js

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm run dev
```

</TabItem>
</MultiPackagerCode>

:::info
When running `sst dev`, SST does not deploy your Next.js app. You are meant to run Next.js locally.
:::

---

## 2. Add file uploads

Let's add a file upload feature to our Next.js app.

---

#### Add an S3 bucket

Add an S3 bucket to your `sst.config.ts`.

```ts title="sst.config.ts"
const bucket = new Bucket(stack, "public");
```

Bind it to your Next.js app.

```diff title="sst.config.ts"
const site = new NextjsSite(stack, "site", {
+ bind: [bucket],
});
```

---

#### Generate a presigned URL

To upload a file to S3 we'll generate a presigned URL. Add this to `pages/index.tsx`.

```ts title="pages/index.tsx" {5}
export async function getServerSideProps() {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: crypto.randomUUID(),
    Bucket: Bucket.public.bucketName,
  });
  const url = await getSignedUrl(new S3Client({}), command);

  return { props: { url } };
}
```

:::tip
With SST we can access our infrastructure in a typesafe way — `Bucket.public.bucketName`. [Learn more](resource-binding.md).
:::

---

#### Add an upload form

Let's add the form. Replace the `Home` component in `pages/index.tsx` with.

```tsx title="pages/index.tsx"
export default function Home({ url }: { url: string }) {
  return (
    <main>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          const file = (e.target as HTMLFormElement).file.files?.[0]!;

          const image = await fetch(url, {
            body: file,
            method: "PUT",
            headers: {
              "Content-Type": file.type,
              "Content-Disposition": `attachment; filename="${file.name}"`,
            },
          });

          window.location.href = image.url.split("?")[0];
        }}
      >
        <input name="file" type="file" accept="image/png, image/jpeg" />
        <button type="submit">Upload</button>
      </form>
    </main>
  );
}
```

This will upload an image and redirect to it!

---

## 3. Add a cron job

Next, we'll add a cron job to remove the uploaded files every day. Add this to `sst.config.ts`.

```ts title="sst.config.ts" {5}
new Cron(stack, "cron", {
  schedule: "rate(1 day)",
  job: {
    function: {
      bind: [bucket],
      handler: "functions/delete.handler",
    },
  },
});
```

Just like our Next.js app, we are binding the S3 bucket to our cron job.

---

#### Add a cron function

Add a function to `functions/delete.ts` that'll go through all the files in the bucket and remove them.

```ts title="functions/delete.ts"
export async function handler() {
  const client = new S3Client({});

  const list = await client.send(
    new ListObjectsCommand({
      Bucket: Bucket.public.bucketName,
    })
  );

  await Promise.all(
    (list.Contents || []).map((file) =>
      client.send(
        new DeleteObjectCommand({
          Key: file.Key,
          Bucket: Bucket.public.bucketName,
        })
      )
    )
  );
}
```

And that's it. We have a simple Next.js app that uploads files to S3 and runs a cron job to delete them!

---

## 4. Deploy to prod

Let's end with deploying our app to production.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst deploy --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst deploy --stage prod
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst deploy --stage prod
```

</TabItem>
</MultiPackagerCode>

:::note
The `sst deploy` command internally uses OpenNext to build your app.
:::

![Next.js app deployed to AWS with SST](/img/start/nextjs-app-deployed-to-aws-with-sst.png)

:::info
[View the source](https://github.com/sst/sst/tree/master/examples/quickstart-nextjs) for this example on GitHub.
:::

---

## Next steps

1. Learn more about SST
   - [`Cron`](../constructs/Cron.md) — Add a cron job to your app
   - [`Bucket`](../constructs/Bucket.md) — Add S3 buckets to your app
   - [`NextjsSite`](../constructs/NextjsSite.md) — Deploy Next.js apps to AWS
   - [Live Lambda Dev](../live-lambda-development.md) — SST's local dev environment
   - [Resource Binding](../resource-binding.md) — Typesafe access to your resources
2. Have a Next.js app on Vercel? [**Migrate it to SST**](../migrating/vercel.md).
3. Ready to dive into the details of SST? <a href={config.guide}>**Check out our guide**</a>.
