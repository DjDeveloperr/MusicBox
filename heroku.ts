import { serve } from "https://deno.land/std@0.83.0/http/server.ts";
import { client } from "./mod.ts"

let port = 8080;
try {
  let envport = Deno.env.get("PORT");
  if (envport) port = envport;
} catch(e) {}

const server = serve({ hostname: "0.0.0.0", port });
console.log(`Server on port: ${port}`);

for await (const request of server) {
  if (client.user) {
    request.respond({ status: 200, body: "Bot Details:\nID: " + client.user?.id + "\nTag: " + client.user?.tag });
  } else request.respond({ status: 200, body: "Bot isn't ready yet." });
}
