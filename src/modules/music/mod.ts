import {
    SlashModule,
    slash,
    Interaction,
    Client,
    Manager,
    Embed,
    SlashCommandInteraction,
} from "../../../deps.ts";
import {
    createManager,
    createProgress,
    formatLength,
    parseLength,
    QueueManager,
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

    @slash() async join(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined || !vs.channelID)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que !== undefined)
            return d.reply({
                content: "I'm already in VC in this server.",
                ephemeral: true,
            });

        const q = this.queues.add(d.guild);
        q.player.connect(vs.channelID, { selfDeaf: true });
        d.reply(`Joined \`${vs.channel?.name}\`!`);
    }

    @slash() async leave(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.respond({
                type: 4,
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        await que.player.destroy(true);
        this.queues.remove(d.guild);
        d.reply("Stopped playing music in this server.");
    }

    @slash() async play(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        let isNew = false;
        let que = this.queues.get(d.guild);
        if (que === undefined) {
            que = this.queues.add(d.guild);
            que.player.connect(vs.channelID as string, {
                selfDeaf: true,
            });
            isNew = true;
        }

        await d.defer();

        const query = d.option<string>("query");
        const search = await que.search(query);
        if (search.length === 0)
            return d.editResponse({
                content: "No track matching that query could be found.",
            });

        await que.enqueue({
            track: search[0].track,
            info: search[0].info,
            by: d.user ?? undefined,
        });

        d.editResponse({
            content: `${isNew ? "Now playing" : "Enqueued"} ${trackToString(
                search[0].info
            )}!`,
        });
    }

    @slash() async pause(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        if (que.player.paused)
            return d.reply({
                content: "Player is already paused!",
                ephemeral: true,
            });

        await que.player.pause();
        d.reply("Paused player!");
    }

    @slash() async search(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content:
                    "I've not joined any VC in this server. Use play command to get started!",
                ephemeral: true,
            });

        await d.defer();
        const res = await que.search(d.option<string>("query"));
        d.editResponse({
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
    async skip(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined || !que.tracks.length)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        await que.skip();
        return d.reply(`Skipped current track!`);
    }

    @slash()
    async resume(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        if (!que.player.paused)
            return d.reply({
                content: "Player is not even paused!",
                ephemeral: true,
            });

        await que.player.pause(false);
        d.reply("Resumed player!");
    }

    @slash()
    nowplaying(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length === 0)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        const first = que.tracks[0].info;
        d.reply({
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
    queue(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length === 0)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        d.reply(
            que.tracks
                .map(
                    (e, i) =>
                        `${
                            i == 0 ? "**[NOW]**" : `${i < 10 ? " " : ""}${i}.`
                        } - ${trackToString(e.info, e.by, e.loop)}`
                )
                .join("\n")
        );
    }

    @slash()
    remove(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length === 0)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        const pos = d.option<number>("position");
        const track = que.tracks[pos];
        if (pos < 1 || !track)
            return d.reply({
                content: `Invalit track number, only between 1-${
                    que.tracks.length - 1
                }.`,
                ephemeral: true,
            });

        que.tracks.splice(pos, 1);
        d.reply(
            `Deleted [${track.info.title}](<${track.info.uri}>) from queue!`
        );
    }

    @slash()
    async movetrack(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined || que.tracks.length < 2)
            return d.reply({
                content:
                    "There must be at least 2 tracks enqueued to use this command.",
                ephemeral: true,
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
            return d.reply({
                content:
                    "Track numbers can't be less than zero or more than queue length.",
                ephemeral: true,
            });

        if (p1 === p2 && pos2 === undefined)
            return d.reply({
                content: "Track is already on top.",
                ephemeral: true,
            });
        else if (p1 === p2)
            return d.reply({
                content: "Both track positions can't be same.",
                ephemeral: true,
            });

        const t1 = que.tracks[p1];
        const t2 = que.tracks[p2];

        if (!t1 || !t2)
            return d.reply({
                content: "One or both tracks could not be found.",
                ephemeral: true,
            });

        que.tracks[p1] = t2;
        que.tracks[p2] = t1;

        if (pos2 === undefined) d.reply("Successfully moved track to top.");
        else d.reply("Successfully swapped tracks.");
    }

    @slash()
    async loopqueue(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        que.loopqueue = !que.loopqueue;
        d.reply(`Loopqueue ${que.loopqueue ? "enabled" : "disabled"}!`);
    }

    @slash()
    async replay(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined || !que.tracks.length)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        await que.player.seek(0);
        d.reply("Replaying the track!");
    }

    @slash()
    async volume(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        let newvol = d.option<number>("new");
        if (newvol === undefined)
            return d.reply(`Volume: ${que.player.volume ?? 100}/100`);

        if (typeof newvol === "string") newvol = Number(newvol);

        if (newvol < 1 || newvol > 100)
            return d.reply({
                content: "Volume should be between 1-100.",
                ephemeral: true,
            });

        await que.player.setVolume(newvol);
        d.reply(`Set volume to ${newvol}!`);
    }

    @slash()
    async seek(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        const len = parseLength(d.option<string>("pos"));
        if (!len || len < 0 || len > (que.tracks[0]?.info.length ?? 0))
            return d.reply({
                content:
                    "Invalid seek position! Max track length is `" +
                    formatLength(que.tracks[0]?.info.length ?? 0) +
                    "`.",
                ephemeral: true,
            });

        await que.player.seek(len);
        d.reply(`Successfully jumped to position: \`${formatLength(len)}\`!`);
    }

    @slash()
    async forward(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        let len = parseLength(d.option<string>("pos"));
        if (!len)
            return d.reply({
                ephemeral: true,
                content: `Invalid time format given! Format is \`<mins>:<secs>\`, like \`1:30\`.`,
            });
        len = len + que.player.position;

        if (len < 0 || len > (que.tracks[0]?.info.length ?? 0))
            return d.reply({
                content:
                    "Invalid forward time! Max track length is `" +
                    formatLength(que.tracks[0]?.info.length ?? 0) +
                    "`.",
                ephemeral: true,
            });

        await que.player.seek(len);
        d.reply(
            `Successfully forwarded and jumped to position: \`${formatLength(
                len
            )}\`!`
        );
    }

    @slash()
    async rewind(d: SlashCommandInteraction) {
        if (d.guild === undefined || d.member === undefined) return;
        const vs = await d.guild.voiceStates.get(d.user.id);
        if (vs === undefined)
            return d.reply({
                content: "You're not in any Voice Channel!",
                ephemeral: true,
            });

        const que = this.queues.get(d.guild);
        if (que === undefined)
            return d.reply({
                content: "I'm not playing anything in this server.",
                ephemeral: true,
            });

        let len = parseLength(d.option<string>("pos"));
        if (!len)
            return d.reply({
                ephemeral: true,
                content: `Invalid time format given! Format is \`<mins>:<secs>\`, like \`1:30\`.`,
            });

        len = que.player.position - len;

        if (len < 0 || len > (que.tracks[0]?.info.length ?? 0))
            return d.reply({
                content:
                    "Invalid forward time! Max track length is `" +
                    formatLength(que.tracks[0]?.info.length ?? 0) +
                    "`.",
                ephemeral: true,
            });

        await que.player.seek(len);
        d.reply(
            `Successfully rewinded and jumped to position: \`${formatLength(
                len
            )}\`!`
        );
    }
}
