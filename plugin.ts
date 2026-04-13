/**
 * maw plugin — install, uninstall, and list command plugins.
 *
 * Install from GitHub:
 *   maw plugin install https://github.com/user/maw-cmd-foo
 *   maw plugin install user/maw-cmd-foo
 *
 * The repo should have a command.ts (or index.ts) that exports:
 *   export const command = { name: "foo", description: "..." };
 *   export default async function(args, flags) { ... }
 *
 * Uninstall:
 *   maw plugin uninstall foo
 *   maw plugin rm foo
 *
 * List:
 *   maw plugin list
 *   maw plugin ls
 *
 * Like Home Assistant add-ons: git clone → symlink → ready.
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

export const command = {
  name: ["plugin", "plugins"],
  description: "Install, uninstall, and list command plugins",
};

const COMMANDS_DIR = join(homedir(), ".oracle", "commands");
const PLUGIN_MANIFEST = join(homedir(), ".oracle", "commands", ".plugins.json");

interface PluginEntry {
  name: string;
  repo: string;
  installedAt: string;
  path: string;
}

function loadManifest(): PluginEntry[] {
  try { return JSON.parse(readFileSync(PLUGIN_MANIFEST, "utf-8")); }
  catch { return []; }
}

function saveManifest(entries: PluginEntry[]) {
  mkdirSync(COMMANDS_DIR, { recursive: true });
  require("fs").writeFileSync(PLUGIN_MANIFEST, JSON.stringify(entries, null, 2) + "\n");
}

export default async function(args: string[]) {
  const sub = args[0]?.toLowerCase();

  if (sub === "install" || sub === "add") {
    await install(args[1]);
  } else if (sub === "uninstall" || sub === "rm" || sub === "remove") {
    await uninstall(args[1]);
  } else if (sub === "list" || sub === "ls" || !sub) {
    await list();
  } else {
    console.log(`\x1b[36mmaw plugin\x1b[0m — manage command plugins\n`);
    console.log(`  maw plugin install <url|slug>  Install from GitHub`);
    console.log(`  maw plugin uninstall <name>    Remove a plugin`);
    console.log(`  maw plugin list                List installed plugins`);
    console.log(`\n\x1b[90mPlugins live in ~/.oracle/commands/\x1b[0m`);
  }
}

async function install(source?: string) {
  if (!source) { console.error("usage: maw plugin install <github-url|org/repo>"); process.exit(1); }

  // Normalize: URL or slug → org/repo
  let slug = source
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  if (!slug.includes("/")) { console.error(`\x1b[31m✗\x1b[0m "${source}" doesn't look like a GitHub repo (need org/repo)`); process.exit(1); }

  const repoName = slug.split("/").pop()!;
  console.log(`\n  \x1b[36m⏳\x1b[0m installing ${slug}...`);

  // Clone via ghq
  try {
    execSync(`ghq get -u github.com/${slug}`, { stdio: "pipe" });
  } catch {
    // Try direct git clone as fallback
    const target = join(homedir(), ".oracle", "command-repos", repoName);
    mkdirSync(join(homedir(), ".oracle", "command-repos"), { recursive: true });
    if (!existsSync(target)) {
      execSync(`git clone https://github.com/${slug}.git ${target}`, { stdio: "pipe" });
    } else {
      execSync(`git -C ${target} pull --ff-only`, { stdio: "pipe" });
    }
  }

  // Find the cloned repo
  let repoPath: string;
  try {
    repoPath = execSync(`ghq list --full-path | grep -i '/${slug}$' | head -1`, { encoding: "utf-8" }).trim();
  } catch {
    repoPath = join(homedir(), ".oracle", "command-repos", repoName);
  }

  if (!existsSync(repoPath)) { console.error(`\x1b[31m✗\x1b[0m clone failed: ${repoPath}`); process.exit(1); }

  // Find the command entry point
  const candidates = ["command.ts", "index.ts", "src/command.ts", "src/index.ts", `${repoName}.ts`];
  let entryFile: string | null = null;
  for (const c of candidates) {
    const p = join(repoPath, c);
    if (existsSync(p)) { entryFile = p; break; }
  }
  if (!entryFile) {
    // Check for any .ts file that exports command
    for (const f of readdirSync(repoPath).filter(f => f.endsWith(".ts"))) {
      const content = readFileSync(join(repoPath, f), "utf-8");
      if (content.includes("export const command")) { entryFile = join(repoPath, f); break; }
    }
  }
  if (!entryFile) { console.error(`\x1b[31m✗\x1b[0m no command entry point found in ${repoPath}`); process.exit(1); }

  // Symlink into ~/.oracle/commands/
  mkdirSync(COMMANDS_DIR, { recursive: true });
  const linkName = join(COMMANDS_DIR, `${repoName}.ts`);
  try { unlinkSync(linkName); } catch { /* expected */ }
  symlinkSync(entryFile, linkName);
  console.log(`  \x1b[32m✓\x1b[0m symlinked: ${linkName} → ${entryFile}`);

  // Verify it loads
  try {
    const mod = await import(entryFile);
    if (mod.command?.name) {
      const name = Array.isArray(mod.command.name) ? mod.command.name[0] : mod.command.name;
      console.log(`  \x1b[32m✓\x1b[0m command registered: maw ${name}`);
      console.log(`  \x1b[90m  ${mod.command.description || ""}\x1b[0m`);
    } else {
      console.log(`  \x1b[33m⚠\x1b[0m no "command" export found — file installed but won't auto-register`);
    }
  } catch (e: any) {
    console.log(`  \x1b[33m⚠\x1b[0m import failed: ${e.message?.slice(0, 80)}`);
  }

  // Update manifest
  const manifest = loadManifest().filter(e => e.name !== repoName);
  manifest.push({ name: repoName, repo: slug, installedAt: new Date().toISOString(), path: entryFile });
  saveManifest(manifest);

  console.log(`\n  \x1b[32m✓ Installed!\x1b[0m Run: maw ${repoName.replace(/^maw-cmd-/, "").replace(/^maw-/, "")}\n`);
}

async function uninstall(name?: string) {
  if (!name) { console.error("usage: maw plugin uninstall <name>"); process.exit(1); }

  const manifest = loadManifest();
  const entry = manifest.find(e => e.name === name || e.name === `maw-cmd-${name}` || e.name === `maw-${name}`);

  // Remove symlink
  const candidates = [
    join(COMMANDS_DIR, `${name}.ts`),
    join(COMMANDS_DIR, `maw-cmd-${name}.ts`),
    join(COMMANDS_DIR, `maw-${name}.ts`),
  ];
  let removed = false;
  for (const f of candidates) {
    if (existsSync(f)) { unlinkSync(f); console.log(`  \x1b[32m✓\x1b[0m removed: ${f}`); removed = true; }
  }

  if (entry) {
    saveManifest(manifest.filter(e => e !== entry));
    console.log(`  \x1b[32m✓\x1b[0m uninstalled: ${entry.name}`);
    console.log(`  \x1b[90m  repo clone kept (ghq/git). Remove manually if needed.\x1b[0m`);
  } else if (!removed) {
    console.error(`  \x1b[31m✗\x1b[0m plugin not found: ${name}`);
  }
}

async function list() {
  // List all .ts/.js files in commands dir
  if (!existsSync(COMMANDS_DIR)) {
    console.log(`\n  \x1b[90mNo plugins. Install: maw plugin install <github-url>\x1b[0m\n`);
    return;
  }

  const files = readdirSync(COMMANDS_DIR).filter(f => /\.(ts|js)$/.test(f));
  const manifest = loadManifest();

  console.log(`\n  \x1b[36mCommand Plugins\x1b[0m  (${files.length} installed)\n`);

  for (const f of files) {
    const fullPath = join(COMMANDS_DIR, f);
    const entry = manifest.find(e => e.path === fullPath || e.name === f.replace(/\.(ts|js)$/, ""));
    const source = entry ? `\x1b[90m← ${entry.repo}\x1b[0m` : "\x1b[90m(local)\x1b[0m";

    try {
      const mod = await import(fullPath);
      const name = mod.command?.name;
      const desc = mod.command?.description || "";
      const displayName = Array.isArray(name) ? name[0] : (name || f);
      console.log(`  \x1b[32m●\x1b[0m maw ${displayName.padEnd(20)} ${desc.slice(0, 40)} ${source}`);
    } catch {
      console.log(`  \x1b[31m●\x1b[0m ${f.padEnd(24)} \x1b[31m(load error)\x1b[0m ${source}`);
    }
  }
  console.log();
}
