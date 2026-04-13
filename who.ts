/**
 * maw who — show current node identity + agents.
 */
export const command = {
  name: "who",
  description: "Show node identity, agents, and peers",
};

export default async function() {
  const { execSync } = require("child_process");
  const run = (cmd: string) => { try { return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim(); } catch { return ""; } };

  const raw = run("curl -s --connect-timeout 3 http://localhost:3456/api/identity 2>/dev/null");
  try {
    const id = JSON.parse(raw);
    console.log(`\n  \x1b[36m${id.node}\x1b[0m v${id.version}`);
    console.log(`  \x1b[90mclock: ${id.clockUtc}\x1b[0m`);
    if (id.agents?.length) {
      console.log(`\n  Agents (${id.agents.length}):`);
      for (const a of id.agents) console.log(`    \x1b[32m●\x1b[0m ${a}`);
    }
    console.log();
  } catch {
    console.log("  \x1b[31m✗\x1b[0m maw serve not running (curl localhost:3456/api/identity failed)");
  }
}
