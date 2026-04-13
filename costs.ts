/**
 * maw costs — token usage + estimated cost per agent.
 * Wraps /api/costs — scans Claude session JSONL files.
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["costs", "cost", "$$"],
  description: "Token usage + estimated cost per agent",
};

interface Agent {
  name: string;
  totalTokens: number;
  estimatedCost: number;
  sessions: number;
  turns: number;
  models: Record<string, number>;
}

interface CostsResponse {
  agents: Agent[];
  total: { tokens: number; cost: number; sessions: number; agents: number };
}

export default async function () {
  let data: CostsResponse;
  try {
    const res = await fetch(`${maw.baseUrl()}/api/costs`, { signal: AbortSignal.timeout(10000) });
    data = await res.json() as CostsResponse;
  } catch {
    maw.print.err("Server unreachable — is maw serve running?");
    return;
  }

  if (!data.agents?.length) { maw.print.dim("No session data found."); return; }

  maw.print.header(`Costs (${data.total.agents} agents, ${data.total.sessions} sessions)`);

  const top = data.agents.slice(0, 12);
  const rows = top.map((a) => [
    a.name.length > 20 ? a.name.slice(0, 17) + "..." : a.name,
    `$${a.estimatedCost.toFixed(2)}`,
    `${(a.totalTokens / 1_000_000).toFixed(1)}M`,
    `${a.sessions}`,
    Object.entries(a.models).map(([k, v]) => `${k}:${v}`).join(" "),
  ]);

  maw.print.table(rows, ["Agent", "Cost", "Tokens", "Sess", "Models"]);
  maw.print.nl();
  maw.print.kv("total cost", `$${data.total.cost.toFixed(2)}`);
  maw.print.kv("total tokens", `${(data.total.tokens / 1_000_000).toFixed(1)}M`);
  maw.print.nl();
}
