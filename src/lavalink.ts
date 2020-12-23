import { Manager, Client, Collection, Guild, Player } from "../deps.ts";
import { config } from "./config.ts";
import type { MusicSlashModule } from "./modules/music/mod.ts";

export const nodes = [
    {
        id: "main",
        host: config.lavalink.host,
        port: config.lavalink.port,
        password: config.lavalink.password,
    },
];

export const createManager = (client: Client) => {
    const mg = new Manager(nodes, {
        send(id, payload) {
            client.gateway?.send(payload);
        },
    });

    client.on("raw", (evt: string, d: any) => {
        if (evt === "VOICE_SERVER_UPDATE") mg.serverUpdate(d);
        else if (evt === "VOICE_STATE_UPDATE") mg.stateUpdate(d);
    });

    return mg;
};

export const formatLength = (len: number) => {
    len = Math.floor(len / 1000);
    let secs = len % 60;
    let mins = (len - secs) / 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const trackToString = (track: TrackInfo) => {
    return `[\`${track.title.replace(/`/g, "")}\`](<${
        track.uri
    }>) - ${track.author.replace(/`/g, "")} - ${formatLength(track.length)}`;
};

const BLUE_SQ = "🟦";
const WHITE_SQ = "⬜";
const PROG_LEN = 16;

export const createProgress = (c: number, m: number) => {
    let perc = (c / m) * 100;
    perc = (perc - (perc % PROG_LEN)) / PROG_LEN;
    return `\`${BLUE_SQ.repeat(perc < 0 ? 0 : perc)}${WHITE_SQ.repeat(
        PROG_LEN - perc < 0 ? 0 : PROG_LEN - perc
    )}\``;
};

export interface TrackInfo {
    identifier: string;
    isSeekable: boolean;
    author: string;
    length: number;
    isStream: boolean;
    position: number;
    title: string;
    uri: string;
}

export interface QueueTrack {
    track: string;
    info: TrackInfo;
}

export class Queue {
    guild: Guild;
    tracks: Array<QueueTrack> = [];
    player: Player;
    current: string | null = null;
    autoplay: boolean = true;
    loopqueue: boolean = false;

    constructor(guild: Guild, player: Player) {
        this.guild = guild;
        this.player = player;

        this.player.on("start", (evt) => {
            this.current = evt.track;
        });

        this.player.on("end", () => {
            this.current = null;
            const track = this.tracks.shift();
            if (this.loopqueue && track !== undefined) this.tracks.push(track);

            if (this.autoplay) {
                this.play();
            }
        });
    }

    async enqueue(track: QueueTrack) {
        this.tracks.push(track);
        if (this.tracks.length === 1) await this.play();
        return this;
    }

    async search(q: string): Promise<QueueTrack[]> {
        return this.player.manager
            .search(`ytsearch:${q}`)
            .then((q) => q.tracks);
    }

    async play(): Promise<Queue> {
        if (this.tracks.length !== 0) {
            this.player.play(this.tracks[0].track);
        }
        return this;
    }

    async skip(): Promise<Queue> {
        this.tracks.shift();
        if (this.tracks.length !== 0) await this.play();
        return this;
    }
}

export class QueueManager {
    mod: MusicSlashModule;
    queues: Collection<string, Queue> = new Collection();

    constructor(mod: MusicSlashModule) {
        this.mod = mod;
    }

    get(guild: Guild | string): Queue | undefined {
        return this.queues.get(guild instanceof Guild ? guild.id : guild);
    }

    has(guild: Guild | string): boolean {
        return this.queues.has(guild instanceof Guild ? guild.id : guild);
    }

    add(guild: Guild): Queue {
        if (this.has(guild)) throw new Error("Guild already in Queue");
        const queue = new Queue(guild, this.mod.lava.create(guild.id));
        this.queues.set(guild.id, queue);
        return queue;
    }

    remove(guild: Guild | string): boolean {
        if (!this.has(guild)) return false;
        else
            return this.queues.delete(
                guild instanceof Guild ? guild.id : guild
            );
    }
}
