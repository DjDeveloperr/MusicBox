import { Client, ClientOptions, event } from "../deps.ts";
import { MusicSlashModule } from "./modules/music/mod.ts";
import { log } from "./util/log.ts";

export class MusicBoxBot extends Client {
  music: MusicSlashModule;

  constructor(token: string) {
    super({
      token,
      intents: ["GUILDS", "GUILD_VOICE_STATES"],
      presence: {
        name: "Music",
        type: "LISTENING",
      },
    });

    const musicModule = new MusicSlashModule(this);
    musicModule.commands = musicModule.commands.map((cmd) => {
      cmd.handler = cmd.handler.bind(musicModule);
      return cmd;
    });
    this.slash.modules.push(musicModule);
    this.music = musicModule;
  }

  @event()
  ready() {
    log("Bot", `Logged in as ${this.user?.tag}!`);

    this.music.lava.on("connect", (e) => {
      log("Lava", `Connected to node:${e}!`);
    });
    this.music.lava.on("disconnect", (e) => {
      log("Lava", `Node Disconnected - node:${e}`);
    });
    this.music.lava.on("error", (e) => {
      log("Lava", `Node Error: ${e}`);
    });

    return this.music.lava.connect(BigInt(this.user!.id));
  }
}
