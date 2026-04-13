/**
 * maw ping — quick peer connectivity check with latency.
 * Simpler than `maw peers` — just reachable/unreachable + ms.
 */
import { maw } from "maw/sdk";

export const command = {
  name: "ping",
  description: "Quick peer connectivity check with latency",
};

export default async function (args: string[]) {
  const fed = await maw.federation();
  if (!fed.totalPeers) { maw.print.dim("No peers configured."); return; }

  const filter = args[0]?.toLowerCase();
  const peers = filter ? fed.peers.filter((p) => (p.node || "").toLowerCase().includes(filter)) : fed.peers;

  if (!peers.length) { maw.print.dim(`No peer matching "${filter}".`); return; }

  for (const p of peers) {
    const name = p.node || new URL(p.url).hostname;
    if (p.reachable) {
      const ms = p.latency != null ? `${p.latency}ms` : "ok";
      const color = (p.latency ?? 0) < 100 ? "\x1b[32m" : (p.latency ?? 0) < 500 ? "\x1b[33m" : "\x1b[31m";
      console.log(`  ${color}●\x1b[0m ${name.padEnd(20)} ${ms}`);
    } else {
      console.log(`  \x1b[31m●\x1b[0m ${name.padEnd(20)} unreachable`);
    }
  }
}
