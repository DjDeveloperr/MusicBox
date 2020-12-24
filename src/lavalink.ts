import { Manager, Client, Collection, Guild, Player } from "../deps.ts";
import { config } from "./config.ts";
import type { MusicSlashModule } from "./modules/music/mod.ts";
import { log } from "./util/log.ts";

export const nodes = [
    {
        id: "master",
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
    _lastSkipped?: QueueTrack;

    constructor(guild: Guild, player: Player) {
        this.guild = guild;
        this.player = player;

        this.player.on("start", (evt) => {
            this.current = evt.track;
            if (this.tracks.length === 0)
                return log("Track", "Started but not in queue");
            log("Track", `Start - ${this.tracks[0].info.title}`);
        });

        this.player.on("end", () => {
            this.current = null;
            const track = this.tracks.shift();
            log("Track", `End - ${track?.info.title}`);
            if (this.loopqueue && track !== undefined) this.tracks.push(track);

            if (this._lastSkipped) {
                this._lastSkipped = undefined;
                this.player.pause(false);
                return;
            }

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

    async play(track?: QueueTrack): Promise<Queue> {
        if (this.tracks.length !== 0) {
            await this.player.play(track ?? this.tracks[0].track);
        }
        return this;
    }

    async skip(): Promise<Queue> {
        if (this.tracks[1] === undefined) return this;
        const track = this.tracks[1];
        this._lastSkipped = track;
        log("Track", `Skip - ${track.info.title}`);
        await this.play(track);
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
