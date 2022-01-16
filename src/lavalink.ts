import { Client, Collection, Guild, lava, Lavalink, User } from "../deps.ts";
import type { MusicSlashModule } from "./modules/music/mod.ts";
import { log } from "./util/log.ts";

let envperm = false;
try {
  Deno.env.get("NOTHING");
  envperm = true;
} catch (e) {
  envperm = false;
}

let config: any = {};
if (envperm == true) {
  config.lavalink = {};
  config.lavalink.host = Deno.env.get("LAVALINK_HOST");
  config.lavalink.port = Deno.env.get("LAVALINK_PORT");
  config.lavalink.password = Deno.env.get("LAVALINK_PASSWORD");
}

if (
  !config.lavalink.host ||
  !config.lavalink.port ||
  !config.lavalink.password
) {
  try {
    config = await import("./config.ts").then((e) => e.config);
  } catch (e) {
    throw new Error(
      "Failed to retreive Lavalink credentials. Either create config.ts or add ENV vars.",
    );
  }
}

export const node = {
  id: "master",
  host: config.lavalink.host,
  port: config.lavalink.port,
  password: config.lavalink.password,
};

export const createManager = (client: Client) => {
  const mg = new lava.Node({
    connection: node,
    sendGatewayPayload: (id, payload) => {
      client.shards.get(Number((id << 22n) % BigInt(client.shards.list.size)))!
        .send(payload);
    },
  });

  client.on("raw", (evt: string, d: any) => {
    if (evt === "VOICE_SERVER_UPDATE") mg.handleVoiceUpdate(d);
    else if (evt === "VOICE_STATE_UPDATE") mg.handleVoiceUpdate(d);
  });

  return mg;
};

export const formatLength = (len: number) => {
  len = Math.floor(len / 1000);
  let secs = len % 60;
  let mins = (len - secs) / 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const parseLength = (pos: string): undefined | number => {
  let spl = pos.split(":").map((e) => e.trim());

  if (spl.length != 2 || isNaN(parseInt(spl[0])) || isNaN(parseInt(spl[1]))) {
    return;
  } else return parseInt(spl[0]) * 60 * 1000 + parseInt(spl[1]) * 1000;
};

export const trackToString = (
  track: TrackInfo,
  user?: User,
  loop?: boolean,
) => {
  return `[\`${track.title.replace(/`/g, "")}\`](<${track.uri}>) - ${
    track.author.replace(/`/g, "")
  } - \`${
    formatLength(
      track.length,
    )
  }\`${user ? ` - ${user.tag}${loop ? " (Loop)" : ""}` : ""}`;
};

const BLUE_SQ = "🟦";
const WHITE_SQ = "⬜";
const PROG_LEN = 16;

export const createProgress = (c: number, m: number) => {
  let perc = (c / m) * 100;
  perc = (perc - (perc % PROG_LEN)) / PROG_LEN;
  return `\`${BLUE_SQ.repeat(perc < 0 ? 0 : perc)}${
    WHITE_SQ.repeat(
      PROG_LEN - perc < 0 ? 0 : PROG_LEN - perc,
    )
  }\``;
};

export const ytThumb = (id: string) => {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
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
  by: User;
  loop?: boolean;
}

export class Queue {
  guild: Guild;
  tracks: Array<QueueTrack> = [];
  player: lava.Player;
  current: string | null = null;
  autoplay: boolean = true;
  loopqueue: boolean = false;
  _lastSkipped?: QueueTrack;

  constructor(guild: Guild, player: lava.Player) {
    this.guild = guild;
    this.player = player;

    this.player.on("trackStart", (evt) => {
      if (!evt) return;
      this.current = evt;
      if (this.tracks.length === 0) {
        return log("Track", "Started but not in queue");
      }

      log("Track", `Start - ${this.tracks[0].info.title}`);

      if (this.guild.id == config.mainGuild) {
        this.guild.client.setPresence({
          name: this.tracks[0].info.title,
          type: "LISTENING",
        });
      }
    });

    this.player.on("trackEnd", () => {
      if (this.guild.id == config.mainGuild) {
        this.guild.client.setPresence({
          name: "Music",
          type: "LISTENING",
        });
      }

      this.current = null;
      const track = this.tracks.shift();
      log("Track", `End - ${track?.info.title}`);
      if (this.loopqueue && track !== undefined) {
        track.loop = true;
        this.tracks.push(track);
      }

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

  async search(q: string): Promise<Lavalink.LoadTracksResponse["tracks"]> {
    return this.player.node
      .rest
      .loadTracks(`ytsearch:${q}`).then((e) => e.tracks);
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
    const queue = new Queue(
      guild,
      this.mod.lava.createPlayer(BigInt(guild.id)),
    );
    this.queues.set(guild.id, queue);
    return queue;
  }

  remove(guild: Guild | string): boolean {
    if (!this.has(guild)) return false;
    else {
      return this.queues.delete(
        guild instanceof Guild ? guild.id : guild,
      );
    }
  }
}
