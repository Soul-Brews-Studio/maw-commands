/**
 * maw peers — federation peer status at a glance.
 * Shows: each peer's reachability, latency, clock drift, agents.
 */
import { maw } from "maw/sdk";

export const command = {
  name: ["peers", "mesh"],
  description: "Federation peer status — latency, clock drift, agents",
};

export default async function() {
  const fed = await maw.federation();
  if (!fed.totalPeers) { maw.print.dim("No peers configured. Add namedPeers to maw.config.json"); return; }

  maw.print.header(`Federation Mesh (${fed.reachablePeers}/${fed.totalPeers} online)`);

  for (const p of fed.peers) {
    const dot = p.reachable ? "\x1b[32m●\x1b[0m" : "\x1b[31m●\x1b[0m";
    const name = p.node || new URL(p.url).hostname;
    const latency = p.latency ? `${p.latency}ms` : "—";
    const drift = p.clockDeltaMs != null ? `${p.clockDeltaMs > 0 ? "+" : ""}${p.clockDeltaMs}ms` : "";
    const warn = p.clockWarning ? " \x1b[33m⚠ drift\x1b[0m" : "";
    const agents = p.agents?.length ? `\x1b[90m${p.agents.length} agents\x1b[0m` : "";

    console.log(`  ${dot} ${name.padEnd(14)} ${latency.padEnd(8)} ${drift.padEnd(10)}${warn} ${agents}`);
  }

  if (fed.clockHealth) {
    maw.print.nl();
    maw.print.kv("local clock", fed.clockHealth.clockUtc);
    maw.print.kv("timezone", fed.clockHealth.timezone);
    maw.print.kv("uptime", `${Math.floor(fed.clockHealth.uptimeSeconds / 60)}m`);
  }
  maw.print.nl();
}
