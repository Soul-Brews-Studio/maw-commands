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

async function api<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${maw.baseUrl()}${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); maw.print.err((d as any).error || "request failed"); return null; }
    return await res.json() as T;
  } catch { maw.print.err("Server unreachable"); return null; }
}

export default async function (args: string[]) {
  const sub = args[0]?.toLowerCase();

  if (sub === "best") {
    const data = await api<any>("/api/avengers/best");
    if (!data) return;
    maw.print.header("Best Account");
    maw.print.ok(`${data.account || data.name || "unknown"}`);
    if (data.remaining != null) maw.print.kv("remaining", `${data.remaining}`);
    if (data.limit != null) maw.print.kv("limit", `${data.limit}`);
    maw.print.nl();
    return;
  }

  if (sub === "traffic") {
    const data = await api<{ traffic: any; speed: any }>("/api/avengers/traffic");
    if (!data) return;
    maw.print.header("Traffic");
    if (Array.isArray(data.traffic)) {
      for (const t of data.traffic) console.log(`  ${(t.account || t.name || "?").padEnd(16)} ${t.requests || 0} req  ${t.tokens || 0} tok`);
    } else { maw.print.dim(JSON.stringify(data.traffic).slice(0, 120)); }
    if (data.speed) { maw.print.nl(); maw.print.kv("speed", JSON.stringify(data.speed)); }
    maw.print.nl();
    return;
  }

  // Default: status
  const data = await api<{ accounts: any[]; total: number }>("/api/avengers/status");
  if (!data) return;
  maw.print.header(`Avengers (${data.total} accounts)`);
  if (!Array.isArray(data.accounts)) { maw.print.dim("No account data"); return; }
  for (const a of data.accounts) {
    const name = (a.account || a.name || "?").padEnd(16);
    const pct = a.limit ? Math.round(((a.remaining ?? 0) / a.limit) * 100) : 0;
    const bar = pct > 50 ? "\x1b[32m" : pct > 20 ? "\x1b[33m" : "\x1b[31m";
    console.log(`  ${bar}●\x1b[0m ${name} ${pct}% remaining  ${a.remaining ?? "?"}/${a.limit ?? "?"}`);
  }
  maw.print.nl();
}
