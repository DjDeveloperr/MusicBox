import {
    SlashModule,
    slash,
    Interaction,
    Client,
    Manager,
    Embed,
} from "../../../deps.ts";
import {
    createManager,
    createProgress,
    formatLength,
    parseLength,
    QueueManager,
    QueueTrack,
    trackToString,
    ytThumb,
} from "../../lavalink.ts";

export class MusicSlashModule extends SlashModule {
    name = "Music";
    client: Client;
    lava: Manager;
    queues: QueueManager;

    constructor(client: Client) {
        super();
        this.client = client;
        this.lava = createManager(this.client);
        this.queues = new QueueManager(this);
    }

    @slash() async join(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined || !vs.channelID)
            return d.respond({
                type: 3,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que !== undefined)
            return d.respond({
                type: 4,
                content: "I'm already in VC in this server.",
                temp: true,
            });

        const q = this.queues.add(d.guild);
        await q.player.connect(vs.channelID, { selfDeaf: true });
        d.respond({
            content: `Joined \`${vs.channel?.name}\`!`,
        });
    }

    @slash() async leave(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        await que.player.destroy(true);
        this.queues.remove(d.guild);
        d.respond({ content: "Stopped playing music in this server." });
    }

    @slash() async play(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        let isNew = false;
        let que = this.queues.get(d.guild);
        if (que === undefined) {
            que = this.queues.add(d.guild);
            await que.player.connect(vs.channelID as string, {
                selfDeaf: true,
            });
            isNew = true;
        }

        const query = d.option<string>("query");
        const search = await que.search(query);
        if (search.length === 0)
            return d.respond({
                type: 4,
                content: "No track matching that query could be found.",
                temp: true,
            });

        await que.enqueue({
            track: search[0].track,
            info: search[0].info,
            by: d.user ?? undefined,
        });

        d.respond({
            content: `${isNew ? "Now playing" : "Enqueued"} ${trackToString(
                search[0].info
            )}!`,
        });
    }

    @slash() async pause(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        if (que.player.paused)
            return d.respond({
                type: 4,
                content: "Player is already paused!",
                temp: true,
            });

        await que.player.pause();
        d.respond({
            content: "Paused player!",
        });
    }

    @slash() async search(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content:
                    "I've not joined any VC in this server. Use play command to get started!",
                temp: true,
            });

        const res = await que.search(d.option<string>("query"));
        d.respond({
            content: `${
                res.length === 0
                    ? "No results."
                    : `${res
                          .filter((e, i) => i < 10)
                          .map((e, i) => `${i + 1}. ${trackToString(e.info)}`)
                          .join("\n")}`
            }`,
        });
    }

    @slash()
    async skip(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined || !que.tracks.length)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        await que.skip();
        return d.respond({
            content: `Skipped track!`,
        });
    }

    @slash()
    async resume(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        if (!que.player.paused)
            return d.respond({
                type: 4,
                content: "Player is not even paused!",
                temp: true,
            });

        await que.player.pause(false);
        d.respond({
            content: "Resumed player!",
        });
    }

    @slash()
    nowplaying(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length === 0)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        const first = que.tracks[0].info;
        d.respond({
            embeds: [
                new Embed()
                    .setAuthor({ name: first.author })
                    .setTitle(first.title)
                    .setURL(first.uri)
                    .setThumbnail({ url: ytThumb(first.identifier) })
                    .addField(
                        "Progress",
                        `\`${formatLength(
                            que.player.position
                        )}\` out of \`${formatLength(
                            first.length
                        )}\`\n${createProgress(
                            que.player.position,
                            first.length
                        )}`
                    )
                    .setDescription(
                        `Requested by - ${
                            que.tracks[0].by?.tag ?? "Deleted User"
                        }${que.tracks[0].loop ? " (Loop)" : ""}`
                    )
                    .setColor(0xff0000),
            ],
        });
    }

    @slash()
    queue(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length === 0)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        d.respond({
            content: que.tracks
                .map(
                    (e, i) =>
                        `${
                            i == 0 ? "**[NOW]**" : `${i < 10 ? " " : ""}${i}.`
                        } - ${trackToString(e.info, e.by, e.loop)}`
                )
                .join("\n"),
        });
    }

    @slash()
    remove(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length === 0)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        const pos = d.option<number>("position");
        const track = que.tracks[pos];
        if (pos < 1 || !track)
            return d.respond({
                type: 4,
                content: `Invalit track number, only between 1-${
                    que.tracks.length - 1
                }.`,
                temp: true,
            });

        que.tracks.splice(pos, 1);
        d.respond({
            content: `Deleted [${track.info.title}](<${track.info.uri}>) from queue!`,
        });
    }

    @slash()
    async movetrack(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length < 2)
            return d.respond({
                type: 4,
                content:
                    "There must be at least 2 tracks enqueued to use this command.",
                temp: true,
            });

        const pos = d.option<number>("track");
        const pos2 = d.option<number | undefined>("track2");

        const p1 = pos;
        const p2 = pos2 ?? 1;

        if (
            p1 < 0 ||
            p2 < 0 ||
            p1 > que.tracks.length - 1 ||
            p2 > que.tracks.length - 1
        )
            return d.respond({
                type: 4,
                content:
                    "Track numbers can't be less than zero or more than queue length.",
                temp: true,
            });

        if (p1 === p2 && pos2 === undefined)
            return d.respond({
                type: 4,
                content: "Track is already on top.",
                temp: true,
            });
        else if (p1 === p2)
            return d.respond({
                type: 4,
                content: "Both track positions can't be same.",
                temp: true,
            });

        const t1 = que.tracks[p1];
        const t2 = que.tracks[p2];

        if (!t1 || !t2)
            return d.respond({
                type: 4,
                content: "One or both tracks could not be found.",
                temp: true,
            });

        que.tracks[p1] = t2;
        que.tracks[p2] = t1;

        if (pos2 === undefined)
            return d.respond({
                content: "Successfully moved track to top.",
            });
        else
            return d.respond({
                content: "Successfully swapped tracks.",
            });
    }

    @slash()
    async loopqueue(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        que.loopqueue = !que.loopqueue;
        d.respond({
            content: `Loopqueue ${que.loopqueue ? "enabled" : "disabled"}!`,
        });
    }

    @slash()
    async replay(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined || !que.tracks.length)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        await que.player.seek(0);
        d.respond({ content: "Replaying the track!" });
    }

    @slash()
    async volume(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        let newvol = d.option<number>("new");
        if (newvol === undefined)
            return d.respond({
                content: `Volume: ${que.player.volume ?? 100}/100`,
            });

        if (typeof newvol === "string") newvol = Number(newvol);

        if (newvol < 1 || newvol > 100)
            return d.respond({
                type: 4,
                content: "Volume should be between 1-100.",
                temp: true,
            });

        await que.player.setVolume(newvol);
        d.respond({
            content: `Set volume to ${newvol}!`,
        });
    }

    @slash()
    async seek(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        const len = parseLength(d.option<string>("pos"));
        if (!len || len < 0 || len > (que.tracks[0]?.info.length ?? 0))
            return d.respond({
                type: 4,
                content:
                    "Invalid seek position! Max track length is `" +
                    formatLength(que.tracks[0]?.info.length ?? 0) +
                    "`.",
                temp: true,
            });

        await que.player.seek(len);
        d.respond({
            content: `Successfully jumped to position: \`${formatLength(
                len
            )}\`!`,
        });
    }

    @slash()
    async forward(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        let len = parseLength(d.option<string>("pos"));
        if (!len)
            return d.respond({
                type: 4,
                temp: true,
                content: `Invalid time format given! Format is \`<mins>:<secs>\`, like \`1:30\`.`,
            });
        len = len + que.player.position;

        if (len < 0 || len > (que.tracks[0]?.info.length ?? 0))
            return d.respond({
                type: 4,
                content:
                    "Invalid forward time! Max track length is `" +
                    formatLength(que.tracks[0]?.info.length ?? 0) +
                    "`.",
                temp: true,
            });

        await que.player.seek(len);
        d.respond({
            content: `Successfully forwarded and jumped to position: \`${formatLength(
                len
            )}\`!`,
        });
    }

    @slash()
    async rewind(d: Interaction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.respond({
                type: 4,
                content: "You're not in any Voice Channel!",
                temp: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                temp: true,
            });

        let len = parseLength(d.option<string>("pos"));
        if (!len)
            return d.respond({
                type: 4,
                temp: true,
                content: `Invalid time format given! Format is \`<mins>:<secs>\`, like \`1:30\`.`,
            });

        len = que.player.position - len;

        // if (len < 0) len = 0;
        // if (
        //     que.tracks[0].info.length &&
        //     len > (que.tracks[0]?.info.length ?? 0)
        // )
        //     len = que.tracks[0].info.length;

        if (len < 0 || len > (que.tracks[0]?.info.length ?? 0))
            return d.respond({
                type: 4,
                content:
                    "Invalid forward time! Max track length is `" +
                    formatLength(que.tracks[0]?.info.length ?? 0) +
                    "`.",
                temp: true,
            });

        await que.player.seek(len);
        d.respond({
            content: `Successfully rewinded and jumped to position: \`${formatLength(
                len
            )}\`!`,
        });
    }
}
