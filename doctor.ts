/**
 * maw doctor — health check across all systems.
 * Checks: server, identity, peers, sessions, plugins.
 */
import { maw } from "maw/sdk";

export const command = {
  name: ["doctor", "doc", "health"],
  description: "System health check — server, peers, sessions, plugins",
};

export default async function () {
  maw.print.header("Doctor");

  const [id, fed, sess, plug] = await Promise.all([
    maw.identity(),
    maw.federation(),
    maw.sessions(true),
    maw.plugins(),
  ]);

  // Server
  if (id.node === "unknown") maw.print.err("Server unreachable — is maw serve running?");
  else maw.print.ok(`Server: ${id.node} v${id.version} (up ${Math.floor(id.uptime / 60)}m)`);

  // Peers
  if (fed.totalPeers === 0) maw.print.dim("No peers configured");
  else if (fed.reachablePeers === fed.totalPeers)
    maw.print.ok(`Peers: ${fed.reachablePeers}/${fed.totalPeers} online`);
  else
    maw.print.warn(`Peers: ${fed.reachablePeers}/${fed.totalPeers} — ${fed.totalPeers - fed.reachablePeers} down`);

  // Sessions
  const agents = sess.filter((s) => /^\d+-/.test(s.name));
  const stale = sess.filter((s) => s.name.endsWith("-view") || s.name.startsWith("maw-pty-"));
  maw.print.ok(`Sessions: ${agents.length} agents, ${sess.length} total`);
  if (stale.length) maw.print.warn(`Stale: ${stale.length} orphaned → maw restart`);

  // Plugins
  if (plug.totalErrors > 0)
    maw.print.warn(`Plugins: ${plug.plugins.length} loaded, ${plug.totalErrors} errors`);
  else if (plug.plugins.length)
    maw.print.ok(`Plugins: ${plug.plugins.length} loaded, ${plug.totalEvents} events`);
  else maw.print.dim("No event plugins loaded");

  // Clock
  if (id.clockUtc) maw.print.kv("clock", id.clockUtc);

  // Verdict
  maw.print.nl();
  const issues =
    (id.node === "unknown" ? 1 : 0) +
    (fed.totalPeers > 0 && fed.reachablePeers < fed.totalPeers ? 1 : 0) +
    (stale.length > 0 ? 1 : 0) +
    (plug.totalErrors > 0 ? 1 : 0);
  if (issues === 0) maw.print.ok("All systems nominal");
  else maw.print.warn(`${issues} issue${issues > 1 ? "s" : ""} — see above`);
  maw.print.nl();
}
