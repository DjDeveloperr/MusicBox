const MAX_TITLE_SIZE = 5;

export const log = (t: string, c?: string, ...colors: string[]) => {
    if (c === undefined) {
        c = t;
        t = "log";
    }

    while (t.length < MAX_TITLE_SIZE) t = " " + t;

    console.log(
        `%c${t} %c${c}`,
        "color: #0DBC79;",
        "color: #C1CCCC;",
        ...colors
    );
};
