import bot from "./mod.ts";
import { commands } from "./src/modules/music/commands.ts";
import { log } from "./src/util/log.ts";

bot.on("ready", () => {
    commands.forEach((cmd) => {
        bot.slash.commands
            .create(cmd)
            .then((cmd) => log("Cmd", `Created command ${cmd.name}!`))
            .catch((e) =>
                log("Cmd", `Failed to create ${cmd.name} - ${e.message}`)
            );
    });
});
