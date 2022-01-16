import bot from "./mod.ts";
import { commands } from "./src/modules/music/commands.ts";
import { log } from "./src/util/log.ts";

bot.connect().then(() =>
  bot.interactions.commands.bulkEdit(commands)
    .then(() => log("Cmd", "Commands created!"))
);
