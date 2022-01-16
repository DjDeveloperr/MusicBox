import { MusicBoxBot } from "./src/bot.ts";
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

let token = envperm && Deno.env.get("BOT_TOKEN")
  ? Deno.env.get("BOT_TOKEN")
  : config.token;

log("Bot", "Connecting...");

const client = new MusicBoxBot(token);

export default client;

if (import.meta.main) {
  await client.connect();
}
