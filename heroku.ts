try {
    Deno.readFileSync("./src/config.ts");
} catch (e) {
    Deno.writeTextFileSync(
        "./src/config.ts",
        `export const config = {
    token: "",
    lavalink: {
        host: "",
        port: 2333,
        password: "",
    },
    mainGuild: "",
};
`
    );
}

export const mod = await import("./mod.ts");
