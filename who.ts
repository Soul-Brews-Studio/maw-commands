/**
 * maw who — show current node identity + agents.
 * Uses maw SDK — typed, safe, no execSync/curl.
 */
import { maw } from "maw/sdk";

export const command = {
  name: "who",
  description: "Show node identity, agents, and peers",
};

export default async function() {
  const id = await maw.identity();
  maw.print.header(`${id.node} v${id.version}`);
  maw.print.kv("clock", id.clockUtc || "unknown");
  if (id.agents.length) {
    maw.print.nl();
    maw.print.dim(`Agents (${id.agents.length}):`);
    maw.print.list(id.agents);
  }
  maw.print.nl();
}
