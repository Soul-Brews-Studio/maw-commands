/**
 * maw feed — recent activity stream across the fleet.
 * Shows: who did what, when, which project.
 */
import { maw } from "maw/sdk";

export const command = {
  name: ["feed", "activity", "log"],
  description: "Activity stream — recent events across the fleet",
};

export default async function (args: string[]) {
  const limit = parseInt(args[0]) || 20;
  const events = await maw.feed(limit);

  if (!events.length) {
    maw.print.dim("No activity yet. Events appear as oracles work.");
    return;
  }

  maw.print.header(`Activity (last ${events.length})`);

  for (const e of events) {
    const time = new Date(e.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const oracle = e.oracle.padEnd(12);
    const proj = e.project ? `\x1b[90m${e.project}\x1b[0m ` : "";
    const event = e.event === "wake" ? "\x1b[32m▲\x1b[0m" : e.event === "sleep" ? "\x1b[33m▼\x1b[0m" : "\x1b[36m●\x1b[0m";
    const msg = e.message.length > 60 ? e.message.slice(0, 57) + "..." : e.message;
    console.log(`  ${event} ${time}  ${oracle} ${proj}${msg}`);
  }
  maw.print.nl();
}
