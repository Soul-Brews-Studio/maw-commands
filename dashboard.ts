/**
 * maw dashboard — open Dashboard Pro in browser.
 */
export const command = {
  name: ["dashboard", "dash", "pro"],
  description: "Open Dashboard Pro in browser",
};

export default async function() {
  const { execSync } = require("child_process");
  const run = (cmd: string) => { try { return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim(); } catch { return ""; } };

  // Detect port
  const configRaw = run("curl -s --connect-timeout 2 http://localhost:3456/api/config 2>/dev/null");
  let port = 3456;
  try { port = JSON.parse(configRaw).port || 3456; } catch {}

  const url = `http://localhost:${port}/#dashboard-pro`;
  console.log(`\n  \x1b[36m📊\x1b[0m Dashboard Pro: ${url}\n`);

  // Try to open in browser
  try {
    const { platform } = require("os");
    const cmd = platform() === "darwin" ? "open" : "xdg-open";
    execSync(`${cmd} '${url}' 2>/dev/null`, { stdio: "pipe" });
  } catch {
    // Can't open browser (SSH, headless) — just print URL
  }
}
