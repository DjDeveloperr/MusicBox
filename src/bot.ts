import { Client, event, slashModule, ClientOptions } from "../deps.ts";
import { MusicSlashModule } from "./modules/music/mod.ts";
import { log } from "./util/log.ts";

export class MusicBoxBot extends Client {
    music: MusicSlashModule;

    constructor(options: ClientOptions = {}) {
        super(
            Object.assign(options, {
                presence: {
                    name: "Music",
                    type: "LISTENING",
                },
            })
        );

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

        this.music.lava.on("socketReady", (e) => {
            log("Lava", `Connected to node:${e.id}!`);
        });
        this.music.lava.on("socketClose", (e) => {
            log("Lava", `Socket Closed - node:${e.id}`);
        });
        this.music.lava.on("socketDisconnect", (e) => {
            log("Lava", `Socket Disconnected - node:${e.id}`);
        });
        this.music.lava.on("socketError", (e, err) => {
            log("Lava", `Socket Error [node:${e.id}] ${err.message}`);
        });

        this.music.lava.init(this.user?.id as string);

        this.music.lava.players.forEach(async (pl) => {
            if (this.music.queues.has(pl.guild)) return;
            if (pl.channel === undefined) return;
            const guild = await this.guilds.get(pl.guild);
            if (guild === undefined) return;
            this.music.queues.add(guild);
            log("Restore", `Restored player of guild: ${guild.id}`);
        });
    }
}
