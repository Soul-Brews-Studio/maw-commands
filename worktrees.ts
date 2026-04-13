/**
 * maw worktrees — list and manage git worktrees.
 * Usage: maw worktrees       — list active worktrees
 *        maw wt              — alias
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["worktrees", "wt"],
  description: "List active git worktrees across oracles",
};

interface Worktree {
  path: string;
  branch: string;
  oracle?: string;
  stale?: boolean;
  head?: string;
}

export default async function () {
  let data: Worktree[];
  try {
    data = await maw.fetch<Worktree[]>("/api/worktrees", { timeout: 10000 });
  } catch {
    maw.print.err("Server unreachable — is maw serve running?");
    return;
  }

  if (!Array.isArray(data) || !data.length) {
    maw.print.dim("No active worktrees. Create: maw wake <oracle> --new <branch>");
    return;
  }

  const stale = data.filter((w) => w.stale);
  maw.print.header(`Worktrees (${data.length}${stale.length ? `, ${stale.length} stale` : ""})`);

  for (const w of data) {
    const dot = w.stale ? "\x1b[33m●\x1b[0m" : "\x1b[32m●\x1b[0m";
    const oracle = (w.oracle || "—").padEnd(14);
    const branch = w.branch || "detached";
    const path = w.path.replace(/^\/home\/\w+\//, "~/");
    const hash = w.head ? ` \x1b[90m${w.head.slice(0, 7)}\x1b[0m` : "";
    console.log(`  ${dot} ${oracle} ${branch.padEnd(20)}${hash}  ${path}`);
  }

  if (stale.length) {
    maw.print.nl();
    maw.print.warn(`${stale.length} stale → maw pulse cleanup`);
  }
  maw.print.nl();
}
