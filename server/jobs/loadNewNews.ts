import { parentPort } from "node:worker_threads";
import process from "node:process";
import { prisma } from "../lib/db";
import { GraphQLClient, gql } from "graphql-request";
import type { NewsPost } from "@prisma/client";
import z, { object } from "zod";

const ENDPOINT = `https://sleeper.app/graphql`;
const GET_NEWS = gql`
  {
    topics(channel_id: "170000000000000000", order_by: "last_created") {
      attachment
      author_avatar
      author_display_name
      author_id
      author_is_bot
      channel_id
      channel_tags
      created
      hidden
      last_message_id
      last_read_id
      last_pinned_message_id
      num_messages
      pinned
      player_tags
      pushed_by
      title
      title_map
      topic_id
      shard_min
      shard_max
    }
  }
`;

const sleeperTopic = z.object({
  channel_tags: z.array(z.string()),
  title: z.string(),
  title_map: z.record(
    z.object({
      type: z.string(),
      data: z
        .object({
          display_name: z.string().optional(),
          info: z
            .object({
              description: z.string(),
              title: z.string(),
            })
            .optional(),
        })
        .optional(),
    })
  ),
  topic_id: z.string(),
});

const sleeperTopics = z.array(sleeperTopic);

const sleeperNewsData = z.object({
  topics: sleeperTopics,
});

(async () => {
  if (parentPort && process.env.SLEEPER_AUTH) {
    const graphQLClient = new GraphQLClient(ENDPOINT, {
      headers: {
        authorization: `${process.env.SLEEPER_AUTH}`,
      },
    });
    const newsStoriesData = await graphQLClient.request(GET_NEWS);
    const newsStories = sleeperNewsData.parse(newsStoriesData);

    const promises: Promise<NewsPost>[] = [];
    for (const news of newsStories.topics) {
      if (news.channel_tags.includes("content")) continue;

      const tag = news.channel_tags[0];

      const objectToSend = {
        title: `${
          tag.charAt(0).toUpperCase() + tag.slice(1)
        } - Fantasy Football Alerts`,
        description: "", // This gets filled in later
        url: "",
        newsIdentifier: news.topic_id,
        author: "",
      };

      const recordKey = Object.keys(news.title_map)[0];

      // TODO - type this better, use a guard

      if (Object.keys(news.title_map).length === 0) {
        objectToSend.description = news.title;
        objectToSend.author =
          objectToSend.description.match(/(@\S+\b)/gi)?.[0] || "SleeperNFL";
      } else if (news.title_map[recordKey].type === "url") {
        objectToSend.description =
          news.title_map[recordKey].data?.info?.description!;
        objectToSend.url = recordKey;
        objectToSend.author =
          objectToSend.description.match(/(@\S+\b)/gi)?.[0] || "SleeperNFL";
      } else if (news.title_map[recordKey].type === "mention") {
        objectToSend.description = news.title;
        objectToSend.author = news.title_map[recordKey].data?.display_name!;
      } else if (news.title_map[recordKey].type === "raw") {
        objectToSend.description = news.title;
        objectToSend.author = recordKey;
      } else {
        objectToSend.description = news.title;
      }

      promises.push(
        prisma.newsPost.upsert({
          where: {
            newsIdentifier: news.topic_id,
          },
          update: {},
          create: objectToSend,
        })
      );
    }
    await Promise.all(promises);
  } else process.exit(0);
})();
