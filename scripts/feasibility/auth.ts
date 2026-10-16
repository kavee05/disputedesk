// Probe 1: can we get a sandbox OAuth token, and which scopes does the app have?
import { BASE_URL, requireEnv, save } from "./lib.ts";

const { clientId, clientSecret } = requireEnv();
const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
});
const body = (await res.json()) as Record<string, any>;
save("auth", { status: res.status, body });
console.log(`POST /v1/oauth2/token -> ${res.status}`);
if (!res.ok) {
  console.log(body);
  process.exit(1);
}

const scopes = String(body.scope ?? "").split(" ");
const interesting = scopes.filter((s) => /dispute|tracking|invoic|reporting|checkout|payments|shipping/i.test(s));
console.log(`token_type=${body.token_type} expires_in=${body.expires_in}s app_id=${body.app_id}`);
console.log(`${scopes.length} scopes in total. Relevant ones:`);
for (const s of interesting) console.log(`  ${s}`);
