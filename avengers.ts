/**
 * maw avengers — ARRA-01 rate limit monitor.
 * Shows: accounts, capacity, traffic stats.
 * Usage: maw avengers         — account status
 *        maw avengers best    — highest capacity
 *        maw avengers traffic — traffic stats
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["avengers", "av"],
  description: "ARRA-01 rate limit monitor — accounts, capacity, traffic",
};

interface Account {
  account?: string;
  name?: string;
  remaining?: number;
  limit?: number;
  requests?: number;
  tokens?: number;
}

interface TrafficResponse {
  traffic: Account[];
  speed: { tokensPerSecond?: number } | null;
}

interface StatusResponse {
  accounts: Account[];
  total: number;
}

export default async function (args: string[]) {
  const sub = args[0]?.toLowerCase();

  if (sub === "best") {
    let data: Account;
    try { data = await maw.fetch<Account>("/api/avengers/best"); }
    catch { maw.print.err("Avengers unreachable or not configured"); return; }
    maw.print.header("Best Account");
    maw.print.ok(`${data.account || data.name || "unknown"}`);
    if (data.remaining != null) maw.print.kv("remaining", `${data.remaining}`);
    if (data.limit != null) maw.print.kv("limit", `${data.limit}`);
    maw.print.nl();
    return;
  }

  if (sub === "traffic") {
    let data: TrafficResponse;
    try { data = await maw.fetch<TrafficResponse>("/api/avengers/traffic"); }
    catch { maw.print.err("Avengers unreachable or not configured"); return; }
    maw.print.header("Traffic");
    for (const t of data.traffic) {
      console.log(`  ${(t.account || t.name || "?").padEnd(16)} ${t.requests || 0} req  ${t.tokens || 0} tok`);
    }
    if (data.speed) { maw.print.nl(); maw.print.kv("speed", `${data.speed.tokensPerSecond ?? 0} tok/s`); }
    maw.print.nl();
    return;
  }

  // Default: status
  let data: StatusResponse;
  try { data = await maw.fetch<StatusResponse>("/api/avengers/status"); }
  catch { maw.print.err("Avengers unreachable or not configured"); return; }
  maw.print.header(`Avengers (${data.total} accounts)`);
  for (const a of data.accounts) {
    const name = (a.account || a.name || "?").padEnd(16);
    const pct = a.limit ? Math.round(((a.remaining ?? 0) / a.limit) * 100) : 0;
    const bar = pct > 50 ? "\x1b[32m" : pct > 20 ? "\x1b[33m" : "\x1b[31m";
    console.log(`  ${bar}●\x1b[0m ${name} ${pct}% remaining  ${a.remaining ?? "?"}/${a.limit ?? "?"}`);
  }
  maw.print.nl();
}
