import { Client, GatewayIntentBits } from "discord.js";

let client: Client;

declare global {
  var discordClient: Client;
}

if (process.env.NODE_ENV === "production") {
  client = getClient();
} else {
  if (!global.discordClient) {
    global.discordClient = getClient();
  }
  client = global.discordClient;
}

function getClient() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  return client;
}

export { client };
