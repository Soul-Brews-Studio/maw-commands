/**
 * maw status — quick fleet overview in one glance.
 * Shows: node, version, agents awake, peers online, pending issues.
 */
export const command = {
  name: ["status", "st"],
  description: "Quick fleet overview — node, agents, peers, issues",
};

export default async function() {
  const { execSync } = require("child_process");
  const run = (cmd: string) => { try { return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim(); } catch { return ""; } };

  const version = run("maw --version");
  const sessionsRaw = run("tmux list-sessions -F '#{session_name}' 2>/dev/null");
  const sessions = sessionsRaw.split("\n").filter(Boolean);
  const fleet = sessions.filter(s => /^\d+-/.test(s));
  const views = sessions.filter(s => s.endsWith("-view"));
  const ptys = sessions.filter(s => s.startsWith("maw-pty-"));

  // Peer check
  const peersRaw = run("curl -s --connect-timeout 3 http://localhost:3456/api/federation/status 2>/dev/null");
  let peersOnline = 0;
  let peersTotal = 0;
  try {
    const p = JSON.parse(peersRaw);
    peersTotal = p.totalPeers || 0;
    peersOnline = p.reachablePeers || 0;
  } catch {}

  // Open issues
  const issuesRaw = run("gh issue list --repo Soul-Brews-Studio/maw-js --state open --json number --jq length 2>/dev/null");
  const issues = parseInt(issuesRaw) || 0;

  console.log(`
  \x1b[36m${version}\x1b[0m

  \x1b[32m●\x1b[0m ${fleet.length} agents awake    \x1b[90mmaw ls\x1b[0m
  ${peersOnline === peersTotal ? "\x1b[32m●\x1b[0m" : "\x1b[33m●\x1b[0m"} ${peersOnline}/${peersTotal} peers online  \x1b[90mmaw ping\x1b[0m
  ${issues > 0 ? "\x1b[33m●\x1b[0m" : "\x1b[32m●\x1b[0m"} ${issues} open issues     \x1b[90mgh issue list\x1b[0m
  ${views.length > 0 ? `\x1b[90m○ ${views.length} stale views     maw restart\x1b[0m` : ""}
  ${ptys.length > 0 ? `\x1b[90m○ ${ptys.length} orphan PTYs     maw restart\x1b[0m` : ""}
`);
}
