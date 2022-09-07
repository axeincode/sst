---
title: Write to the Database
---

import ChangeText from "@site/src/components/ChangeText";

We are ready to add our new comments feature.

---

## Scaffold business logic

We'll start by scaffolding the domain code first. As mentioned in the [last chapter](domain-driven-design.md), we'll add this to our `core` package.

<ChangeText>

Open up `services/core/article.ts` and add the following two functions to the bottom of the file.

</ChangeText>

```js
export async function addComment(articleID: string, text: string) {
  // code for adding a comment to an article
}

export async function comments(articleID: string) {
  // code for getting a list of comments of an article
}
```

Before we can implement them, we'll need to create a new table to store the comments.

---

## Create a migration

Let's create a new migration for this.

<ChangeText>

Run this in the **root of the project** to create a new migration

</ChangeText>

```bash
npm run gen migration new
```

<ChangeText>

It'll ask you to name your migration. Type in **`comment`**.

</ChangeText>

```bash
? Migration name › comment
```

Once the migration is created, you should see the following in your terminal.

```bash
✔ Migration name · comment

Loaded templates: _templates
       added: services/migrations/1661988563371_comment.mjs
```

<ChangeText>

Open up the new migration script and replace its content with:

</ChangeText>

```ts title="services/migrations/1661988563371_comment.mjs"
import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await db.schema
    .createTable("comment")
    .addColumn("commentID", "text", (col) => col.primaryKey())
    .addColumn("articleID", "text", (col) => col.notNull())
    .addColumn("text", "text", (col) => col.notNull())
    .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
  await db.schema.dropTable("comment").execute();
}
```

This migration will create a new table called `comment`. While undoing the migration will drop the table.

---

## Run a migration

Let's go ahead and run the migration.

<ChangeText>

Go to the RDS tab in SST Console and click **Apply** on our `comment` migration.

</ChangeText>

![Console run migration](/img/implement-rds/run-migration.png)

To verify that the table has been created; enter the following in the query editor, and hit **Execute**.

```sql
SELECT * FROM comment
```

![Console query comments table](/img/implement-rds/console-query-comment.png)

You should see **0 rows** being returned.

---

## Query the table

We are now ready to implement the `addComment` and `comments` functions.

<ChangeText>

Replace the two placeholder functions in `services/core/article.ts` with:

</ChangeText>

```ts {2-9,13-16} title="services/core/article.ts"
export async function addComment(articleID: string, text: string) {
  return await SQL.DB.insertInto("comment")
    .values({
      commentID: ulid(),
      articleID,
      text,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function comments(articleID: string) {
  return await SQL.DB.selectFrom("comment")
    .selectAll()
    .where("articleID", "=", articleID)
    .execute();
}
```

We are using [Kysely](https://koskimas.github.io/kysely/) to run typesafe queries against our database.

<details>
<summary>Behind the scenes</summary>

There are a couple of interesting details here, let's dig in:

1. `SQL.DB` is the Kysely instance imported from `services/core/sql.ts`.

   ```ts title="services/core/sql.ts"
   export const DB = new Kysely<Database>({
     dialect: new DataApiDialect({
       mode: "postgres",
       driver: {
         secretArn: Config.RDS_SECRET_ARN,
         resourceArn: Config.RDS_ARN,
         database: Config.RDS_DATABASE,
         client: new RDSDataService(),
       },
     }),
   });
   ```

2. You might recall us talking about the `Config` values back in the [Project Structure](project-structure.md#stacks) chapter. They are passed in to our API in `stacks/Api.ts`.

   ```ts title="stacks/Api.ts" {3}
   function: {
    permissions: [db.rds],
    config: [...db.parameters],
   },
   ```

   And were defined in the `stacks/Database.ts`.

   ```ts title="stacks/Database.ts"
   parameters: [
     new Config.Parameter(stack, "RDS_SECRET_ARN", {
       value: rds.secretArn,
     }),
     new Config.Parameter(stack, "RDS_DATABASE", {
       value: rds.defaultDatabaseName,
     }),
     new Config.Parameter(stack, "RDS_ARN", {
       value: rds.clusterArn,
     }),
   ],
   ```

3. The Kysely instance also needs a `Database` type. This is coming from `services/core/sql.generated.ts`.

   ```ts title="services/core/sql.generated.ts"
   export interface Database {
     article: article;
     comment: comment;
     kysely_migration: kysely_migration;
     kysely_migration_lock: kysely_migration_lock;
   }
   ```

   The keys of this interface are the table names in our database. And they in turn point to other interfaces that list the column types of the respective tables. For example, here's the new `comment` table we just created:

   ```ts
   export interface comment {
     articleID: string;
     commentID: string;
     text: string;
   }
   ```

4. The `sql.generated.ts` types file, as you might've guessed in auto-generated. Our infrastructure code generates this when a new migration is run!

   It's defined in `stacks/Database.ts`.

   ```ts title="stacks/Database.ts" {4}
   const rds = new RDS(stack, "rds", {
     engine: "postgresql10.14",
     migrations: "services/migrations",
     types: "services/core/sql.generated.ts",
     defaultDatabaseName: "main",
   });
   ```

   Even though this file is auto-generated, you should check it into Git. We'll be relying on it later on in this tutorial.

</details>

---

Now with our business logic and database queries implemented, we are ready to hook up our API.
