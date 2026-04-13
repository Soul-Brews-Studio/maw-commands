/**
 * maw st — quick fleet overview. SDK-powered.
 */
import { maw } from "/home/neo/Code/github.com/Soul-Brews-Studio/maw-js/src/sdk";

export const command = {
  name: ["status", "st"],
  description: "Quick fleet overview — node, agents, peers, issues",
};

export default async function() {
  const [id, fed, sess] = await Promise.all([
    maw.identity(),
    maw.federation(),
    maw.sessions(true),
  ]);

  const fleet = sess.filter(s => /^\d+-/.test(s.name));
  const stale = sess.filter(s => s.name.endsWith("-view") || s.name.startsWith("maw-pty-"));

  maw.print.header(`${id.node} v${id.version}`);
  maw.print.ok(`${fleet.length} agents awake`);
  if (fed.reachablePeers === fed.totalPeers && fed.totalPeers > 0)
    maw.print.ok(`${fed.reachablePeers}/${fed.totalPeers} peers online`);
  else if (fed.totalPeers > 0)
    maw.print.warn(`${fed.reachablePeers}/${fed.totalPeers} peers online`);
  if (stale.length > 0)
    maw.print.warn(`${stale.length} stale sessions → maw restart`);
  maw.print.nl();
}
