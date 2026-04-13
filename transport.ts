/**
 * maw transport — transport layer connectivity status.
 * Shows: tmux, HTTP, MQTT and other active transports.
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["transport", "tp"],
  description: "Transport layer status — tmux, HTTP, MQTT connectivity",
};

interface TransportStatus {
  transports: { name: string; connected: boolean; type?: string; url?: string }[];
  timestamp: string;
}

export default async function () {
  let data: TransportStatus;
  try {
    const res = await fetch(`${maw.baseUrl()}/api/transport/status`, { signal: AbortSignal.timeout(5000) });
    data = await res.json() as TransportStatus;
  } catch {
    maw.print.err("Server unreachable — is maw serve running?");
    return;
  }

  if (!data.transports?.length) { maw.print.dim("No transports configured."); return; }

  const up = data.transports.filter((t) => t.connected).length;
  maw.print.header(`Transports (${up}/${data.transports.length} connected)`);

  for (const t of data.transports) {
    const dot = t.connected ? "\x1b[32m●\x1b[0m" : "\x1b[31m●\x1b[0m";
    const status = t.connected ? "connected" : "disconnected";
    const extra = t.url ? ` \x1b[90m${t.url}\x1b[0m` : "";
    console.log(`  ${dot} ${t.name.padEnd(12)} ${status}${extra}`);
  }
  maw.print.nl();
}
