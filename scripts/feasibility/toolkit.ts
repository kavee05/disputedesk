// Probe 5: what does the official PayPal Agent Toolkit give us for disputes?
// Calls the toolkit's tools directly (no LLM involved) through its OpenAI
// adapter's handleToolCall, so we compare it like for like with raw REST.
//
//   npm run probe:toolkit
import { PayPalAgentToolkit, ALL_TOOLS_ENABLED } from "@paypal/agent-toolkit/openai";
import { loadState, requireEnv, save } from "./lib.ts";

const { clientId, clientSecret } = requireEnv();
const toolkit = new PayPalAgentToolkit({
  clientId,
  clientSecret,
  configuration: { actions: ALL_TOOLS_ENABLED, context: { sandbox: true } },
});

const names = toolkit.getTools().map((t) => t.function.name);
const disputeTools = names.filter((n) => n.includes("dispute"));
const trackingTools = names.filter((n) => n.includes("shipment") || n.includes("tracking"));
console.log(`${names.length} tools in total`);
console.log(`dispute tools:  ${disputeTools.join(", ")}`);
console.log(`tracking tools: ${trackingTools.join(", ")}`);
save("toolkit-tools", { names });

async function call(name: string, args: Record<string, unknown>) {
  const out = await toolkit.handleToolCall({
    id: `probe-${name}`,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  });
  save(`toolkit-${name}`, { args, out });
  const text = String(out.content);
  console.log(`\n${name}(${JSON.stringify(args)}):\n  ${text.slice(0, 500)}`);
  return text;
}

await call("list_disputes", {});
const first = Object.values(loadState().cases).find((c) => c?.disputeId)?.disputeId;
if (first) await call("get_dispute", { dispute_id: first });
else console.log("\nNo mapped dispute yet, skipping get_dispute. Run `npm run probe:disputes -- map` first.");
// accept_dispute_claim is deliberately not called here: it is a final-state
// action and is covered by the link-gated REST probe on D3.
