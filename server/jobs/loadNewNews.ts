import { parentPort } from "node:worker_threads";
import process from "node:process";
import { prisma } from "../lib/db";
import { GraphQLClient, gql } from "graphql-request";
import type { NewsPost } from "@prisma/client";

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

type SleeperStory = {
  type: string;
  data?: {
    url: string;
    info: {
      title: string;
      site_name: string;
      description: string;
    };
    hostname: string;
  };
};

(async () => {
  if (parentPort && process.env.SLEEPER_AUTH) {
    const graphQLClient = new GraphQLClient(ENDPOINT, {
      headers: {
        authorization: `${process.env.SLEEPER_AUTH}`,
      },
    });
    const newsStories = await graphQLClient.request(GET_NEWS);

    const promises: Promise<NewsPost>[] = [];
    for (const news of newsStories.topics) {
      // TODO: Use Zod to verify this is true
      const sleeperStory = Object.values(news.title_map)[0] as SleeperStory;
      if (sleeperStory && sleeperStory.data) {
        const tag = news.channel_tags[0];
        promises.push(
          prisma.newsPost.upsert({
            where: {
              newsIdentifier: news.topic_id,
            },
            update: {},
            create: {
              title: `${tag[0].toUpperCase()}${tag.slice(
                1
              )} - Fantasy Football Alerts`,
              description: sleeperStory.data.info.description,
              url: sleeperStory.data.url,
              newsIdentifier: news.topic_id,
              author: sleeperStory.data.info.title,
            },
          })
        );
      }
    }
    await Promise.all(promises);
  } else process.exit(0);
})();
