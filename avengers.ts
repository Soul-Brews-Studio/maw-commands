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

export default async function (args: string[]) {
  const sub = args[0]?.toLowerCase();

  if (sub === "best") {
    let data: any;
    try { data = await maw.fetch("/api/avengers/best"); }
    catch (e: any) { maw.print.err(e.message); return; }
    if (!data) return;
    maw.print.header("Best Account");
    maw.print.ok(`${data.account || data.name || "unknown"}`);
    if (data.remaining != null) maw.print.kv("remaining", `${data.remaining}`);
    if (data.limit != null) maw.print.kv("limit", `${data.limit}`);
    maw.print.nl();
    return;
  }

  if (sub === "traffic") {
    let data: { traffic: any; speed: any };
    try { data = await maw.fetch("/api/avengers/traffic"); }
    catch (e: any) { maw.print.err(e.message); return; }
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
  let data: { accounts: any[]; total: number };
  try { data = await maw.fetch("/api/avengers/status"); }
  catch (e: any) { maw.print.err(e.message); return; }
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
