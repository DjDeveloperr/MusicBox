import { SlashCommandPartial, SlashCommandOptionType } from "../../../deps.ts";

export const commands: SlashCommandPartial[] = [
    {
        name: "play",
        description: "Start playing music in your current VC!",
        options: [
            {
                name: "query",
                description: "Query to search for music on YouTube.",
                type: SlashCommandOptionType.STRING,
                required: true,
            },
        ],
    },
    {
        name: "search",
        description: "Search for music on YouTube!",
        options: [
            {
                name: "query",
                description: "Query to search for music on YouTube.",
                type: SlashCommandOptionType.STRING,
                required: true,
            },
        ],
    },
    {
        name: "pause",
        description: "Pause the music.",
        options: [],
    },
    {
        name: "resume",
        description: "Resume the paused music.",
        options: [],
    },
    {
        name: "skip",
        description: "Skip current track.",
        options: [],
    },
    {
        name: "join",
        description: "Make the bot join your current VC.",
        options: [],
    },
    {
        name: "leave",
        description: "Make the bot leave your current VC.",
        options: [],
    },
    {
        name: "queue",
        description: "Check current tracks queue.",
        options: [
            {
                name: "page",
                type: SlashCommandOptionType.INTEGER,
                description: "Optional page number to look for in queue.",
                required: false,
            },
        ],
    },
    {
        name: "nowplaying",
        description: "Check info of the current track being played.",
        options: [],
    },
    {
        name: "loopqueue",
        description: "Enable disable looping Tracks Queue.",
        options: [],
    },
    {
        name: "remove",
        description: "Remove a track from queue.",
        options: [
            {
                name: "position",
                type: SlashCommandOptionType.INTEGER,
                description: "Position of track in the queue.",
                required: true,
            },
        ],
    },
    {
        name: "movetrack",
        description: "Swap a track to top or swap positions of two tracks.",
        options: [
            {
                name: "track",
                type: SlashCommandOptionType.INTEGER,
                description: "Position of track to move.",
                required: true,
            },
            {
                name: "track2",
                type: SlashCommandOptionType.INTEGER,
                description:
                    "Position of second track if you want to swap two.",
                required: false,
            },
        ],
    },
    {
        name: "replay",
        description: "Replay the current track from start.",
    },
    {
        name: "volume",
        description: "View or set volume of the player.",
        options: [
            {
                name: "new",
                description: "New volume to set if any.",
                required: false,
                type: SlashCommandOptionType.INTEGER,
            },
        ],
    },
    {
        name: "seek",
        description: "Change player's track position.",
        options: [
            {
                name: "pos",
                description: "New Track Position, such as 0:30.",
                type: SlashCommandOptionType.STRING,
                required: true,
            },
        ],
    },
    {
        name: "forward",
        description: "Forward player's track position.",
        options: [
            {
                name: "pos",
                description: "Time to forward track position, such as 0:10.",
                type: SlashCommandOptionType.STRING,
                required: true,
            },
        ],
    },
    {
        name: "rewind",
        description: "Rewind player's track position.",
        options: [
            {
                name: "pos",
                description: "Time to rewind Track Position, such as 0:10.",
                type: SlashCommandOptionType.STRING,
                required: true,
            },
        ],
    },
];
