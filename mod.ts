import { MusicBoxBot } from "./src/bot.ts";
import { config } from "./src/config.ts";
import { Intents, GatewayIntents } from "./deps.ts";
import { log } from "./src/util/log.ts";

log("Bot", "Connecting...");
const client = new MusicBoxBot();
client.connect(
    config.token,
    Intents.create(
        ["GUILD_MEMBERS"],
        [
            GatewayIntents.DIRECT_MESSAGE_TYPING,
            GatewayIntents.DIRECT_MESSAGES,
            GatewayIntents.DIRECT_MESSAGE_REACTIONS,
            GatewayIntents.GUILD_BANS,
            GatewayIntents.GUILD_INTEGRATIONS,
            GatewayIntents.GUILD_WEBHOOKS,
            GatewayIntents.GUILD_MESSAGE_REACTIONS,
            GatewayIntents.GUILD_MESSAGE_TYPING,
        ]
    )
);

export default client;
