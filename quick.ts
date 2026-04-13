/**
 * maw quick — the 5 commands you actually need, with context.
 * Replaces 94 lines of --help with actionable suggestions.
 */
export const command = {
  name: ["quick", "q", "?"],
  description: "Context-aware quick actions — what can I do right now?",
};

export default async function() {
  const { execSync } = require("child_process");
  const run = (cmd: string) => { try { return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim(); } catch { return ""; } };

  const sessions = run("tmux list-sessions -F '#{session_name}' 2>/dev/null").split("\n").filter(Boolean);
  const fleet = sessions.filter((s: string) => /^\d+-/.test(s));
  const stale = sessions.filter((s: string) => s.endsWith("-view") || s.startsWith("maw-pty-"));

  const configRaw = run("curl -s --connect-timeout 2 http://localhost:3456/api/config 2>/dev/null");
  let agents: Record<string, string> = {};
  try { agents = JSON.parse(configRaw).agents || {}; } catch {}

  const issuesRaw = run("gh issue list --repo Soul-Brews-Studio/maw-js --state open --json number,title --jq '.[:3] | .[] | \"#\\(.number) \\(.title)\"' 2>/dev/null");

  console.log(`\n  \x1b[36mWhat can I do?\x1b[0m\n`);

  // Always useful
  console.log(`  \x1b[33mtalk\x1b[0m    maw hey <agent> "message"   ${fleet.length > 0 ? `\x1b[90m${fleet.length} agents awake\x1b[0m` : "\x1b[90mno agents\x1b[0m"}`);
  console.log(`  \x1b[33mwatch\x1b[0m   maw peek <agent>            \x1b[90msee what they're doing\x1b[0m`);
  console.log(`  \x1b[33mstart\x1b[0m   maw wake <oracle>           \x1b[90mwake an oracle\x1b[0m`);
  console.log(`  \x1b[33msee\x1b[0m     maw ls                      \x1b[90mlist everything\x1b[0m`);
  console.log(`  \x1b[33mfix\x1b[0m     maw restart                 \x1b[90mclean + restart fleet\x1b[0m`);

  // Context-aware suggestions
  if (stale.length > 0) {
    console.log(`\n  \x1b[33m⚠\x1b[0m  ${stale.length} stale sessions → \x1b[36mmaw restart --no-update\x1b[0m`);
  }
  if (issuesRaw) {
    console.log(`\n  \x1b[90mOpen issues:\x1b[0m`);
    for (const line of issuesRaw.split("\n").filter(Boolean)) {
      console.log(`    ${line}`);
    }
  }
  console.log();
}
