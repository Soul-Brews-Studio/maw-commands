/**
 * maw morning — daily briefing in one shot.
 * Composites: identity + federation + sessions + feed.
 * Like running doctor + st + feed together.
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["morning", "gm", "briefing"],
  description: "Daily briefing — health, fleet, activity in one shot",
};

export default async function () {
  const [id, fed, sess, events] = await Promise.all([
    maw.identity(),
    maw.federation(),
    maw.sessions(true),
    maw.feed(10),
  ]);

  // Header
  const clock = id.clockUtc ? new Date(id.clockUtc).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "??:??";
  maw.print.header(`Good morning — ${id.node} v${id.version} (${clock} UTC)`);

  // Health
  if (id.node === "unknown") maw.print.err("Server down!");
  else maw.print.ok(`Server up (${Math.floor(id.uptime / 60)}m)`);

  if (fed.totalPeers > 0) {
    const ok = fed.reachablePeers === fed.totalPeers;
    (ok ? maw.print.ok : maw.print.warn)(`Peers: ${fed.reachablePeers}/${fed.totalPeers}`);
  }

  // Fleet
  const agents = sess.filter((s) => /^\d+-/.test(s.name));
  const stale = sess.filter((s) => s.name.endsWith("-view") || s.name.startsWith("maw-pty-"));
  maw.print.ok(`${agents.length} agents awake, ${sess.length} sessions`);
  if (stale.length) maw.print.warn(`${stale.length} stale → maw restart`);

  // Activity
  if (events.length) {
    maw.print.nl();
    maw.print.dim("Recent activity:");
    for (const e of events.slice(0, 5)) {
      const time = new Date(e.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const icon = e.event === "wake" ? "\x1b[32m▲\x1b[0m" : e.event === "sleep" ? "\x1b[33m▼\x1b[0m" : "\x1b[36m●\x1b[0m";
      const msg = e.message.length > 50 ? e.message.slice(0, 47) + "..." : e.message;
      console.log(`    ${icon} ${time}  ${e.oracle.padEnd(12)} ${msg}`);
    }
  }

  maw.print.nl();
}
