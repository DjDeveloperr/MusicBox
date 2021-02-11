import { MusicBoxBot } from "./src/bot.ts";
import { Intents, GatewayIntents } from "./deps.ts";
import { log } from "./src/util/log.ts";

let envperm = false;
try {
    Deno.env.get("NOTHING");
    envperm = true;
} catch (e) {
    envperm = false;
}

let config: any = {};
try {
    config = await import("./src/config.ts").then((e) => e.config);
} catch (e) {}

let token =
    envperm && Deno.env.get("BOT_TOKEN")
        ? Deno.env.get("BOT_TOKEN")
        : config.token;

log("Bot", "Connecting...");
const client = new MusicBoxBot();
client.connect(
    token,
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
