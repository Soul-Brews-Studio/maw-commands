/**
 * maw logs — search session history or list agents.
 * Usage: maw logs [query]    — search across all agents
 *        maw logs agents     — list agents with session counts
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["logs", "search"],
  description: "Search session history or list agents",
};

async function api<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${maw.baseUrl()}${path}`, { signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.json() as T : null;
  } catch { return null; }
}

export default async function (args: string[]) {
  if (args[0] === "agents") {
    const data = await api<{ agents: { name: string; files: number; lines: number; lastModified: string | null }[] }>("/api/logs/agents");
    if (!data?.agents?.length) { maw.print.dim("No agents found."); return; }
    maw.print.header(`Agents (${data.agents.length})`);
    const rows = data.agents.map((a) => [
      a.name.length > 22 ? a.name.slice(0, 19) + "..." : a.name,
      `${a.files}`,
      `${a.lines}`,
      a.lastModified ? new Date(a.lastModified).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—",
    ]);
    maw.print.table(rows, ["Agent", "Sessions", "Lines", "Last"]);
    maw.print.nl();
    return;
  }

  const q = args.join(" ") || "";
  if (!q) { maw.print.dim("Usage: maw logs <query> | maw logs agents"); return; }

  const data = await api<{ entries: { agent: string; timestamp: string; message: { role: string; content: string } | null }[] }>(
    `/api/logs?q=${encodeURIComponent(q)}&limit=15`
  );
  if (!data?.entries?.length) { maw.print.dim(`No results for "${q}".`); return; }

  maw.print.header(`Search: "${q}" (${data.entries.length} hits)`);
  for (const e of data.entries) {
    const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "??:??";
    const role = e.message?.role === "user" ? "\x1b[33m→\x1b[0m" : "\x1b[36m←\x1b[0m";
    const text = (e.message?.content || "[no content]").slice(0, 70).replace(/\n/g, " ");
    console.log(`  ${role} ${time}  ${e.agent.padEnd(14).slice(0, 14)}  ${text}`);
  }
  maw.print.nl();
}
