/**
 * maw triggers — list configured workflow triggers.
 * Shows: event type, action, repo scope, last fired status.
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["triggers", "trigger"],
  description: "Workflow triggers — events, actions, last fired",
};

interface Trigger {
  index: number;
  on: string;
  action: string;
  repo?: string | null;
  name?: string | null;
  timeout?: number | null;
  lastFired?: { ts: string; ok: boolean; error?: string | null } | null;
}

export default async function () {
  let data: { triggers: Trigger[]; total: number };
  try {
    data = await maw.fetch<typeof data>("/api/triggers");
  } catch {
    maw.print.err("Server unreachable — is maw serve running?");
    return;
  }

  if (!data.triggers?.length) {
    maw.print.dim("No triggers configured. Add to maw.config.json triggers[] array.");
    return;
  }

  maw.print.header(`Triggers (${data.total})`);

  for (const t of data.triggers) {
    const dot = t.lastFired ? (t.lastFired.ok ? "\x1b[32m●\x1b[0m" : "\x1b[31m●\x1b[0m") : "\x1b[90m○\x1b[0m";
    const name = (t.name || t.on).padEnd(16);
    const action = t.action.length > 30 ? t.action.slice(0, 27) + "..." : t.action;
    const scope = t.repo ? `\x1b[90m${t.repo}\x1b[0m` : "";
    const last = t.lastFired
      ? `\x1b[90m${new Date(t.lastFired.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}\x1b[0m`
      : "\x1b[90mnever\x1b[0m";
    console.log(`  ${dot} ${name} ${action.padEnd(32)} ${last} ${scope}`);
  }
  maw.print.nl();
}
