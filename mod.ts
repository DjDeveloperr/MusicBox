import { MusicBoxBot } from "./src/bot.ts";
import { config } from "./src/config.ts";
import { Intents, GatewayIntents } from "./deps.ts";
import { log } from "./src/util/log.ts";

let envperm = false;
try { Deno.env.get("NOTHING"); envperm = true; } catch(e) { envperm = false; }

let token = envperm && Deno.env.get("BOT_TOKEN") ? Deno.env.get("BOT_TOKEN") : config.token;
log("Debug", "Using token: " + token);

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
