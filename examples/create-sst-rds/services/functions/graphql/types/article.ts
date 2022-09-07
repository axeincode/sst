import { Article } from "@create-sst-rds/core/article";
import { SQL } from "@create-sst-rds/core/sql";
import { builder } from "../builder";

const ArticleType = builder.objectRef<SQL.Row["article"]>("Article").implement({
  fields: (t) => ({
    id: t.exposeID("articleID"),
    url: t.exposeString("url"),
    title: t.exposeString("title"),
  }),
});

builder.queryFields((t) => ({
  article: t.field({
    type: ArticleType,
    args: {
      articleID: t.arg.string({ required: true }),
    },
    resolve: (_, args) => Article.get(args.articleID),
  }),
  articles: t.field({
    type: [ArticleType],
    resolve: () => Article.list(),
  }),
}));

builder.mutationFields((t) => ({
  createArticle: t.field({
    type: ArticleType,
    args: {
      url: t.arg.string({ required: true }),
      title: t.arg.string({ required: true }),
    },
    resolve: (_, args) => Article.create(args.title, args.url),
  }),
}));
