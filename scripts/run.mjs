// One-command launcher.
//   node scripts/run.mjs demo      demo mode (simulated PayPal), dev server
//   node scripts/run.mjs dev       uses your .env (PayPal Sandbox if keys are set)
//   node scripts/run.mjs prod      production build, then start
import { spawnSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";

const mode = process.argv[2] ?? "demo";
const env = { ...process.env };
const portArg = process.argv.indexOf("--port");
const port = portArg > 0 ? process.argv[portArg + 1] : (env.PORT ?? "3000");

if (mode === "demo") {
  env.DEMO_MODE = "true";
  env.DATABASE_PATH ??= "data/demo.db";
}

const next = (args) => spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], { stdio: "inherit", env });

if (mode === "prod") {
  if (!existsSync(".next/BUILD_ID") || process.argv.includes("--rebuild")) {
    const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { stdio: "inherit", env });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }
  next(["start", "-p", port]).on("exit", (code) => process.exit(code ?? 0));
} else {
  console.log(mode === "demo" ? "\nDisputeDesk in demo mode: simulated PayPal, fictional cases.\n" : "\nDisputeDesk using your .env settings.\n");
  next(["dev", "-p", port]).on("exit", (code) => process.exit(code ?? 0));
}
