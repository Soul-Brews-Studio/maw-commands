/**
 * maw plugin — install, uninstall, and list command plugins.
 *
 * Install from GitHub (copies files, no symlinks):
 *   maw plugin install Soul-Brews-Studio/maw-commands
 *   maw plugin install Soul-Brews-Studio/maw-commands --dir ~/custom/dir
 *   maw plugin install Soul-Brews-Studio/maw-commands/costs.ts
 *
 * Uninstall:
 *   maw plugin uninstall costs
 *   maw plugin rm costs
 *
 * List:
 *   maw plugin list
 *   maw plugin ls
 */
import { existsSync, readdirSync, readFileSync, mkdirSync, unlinkSync, copyFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

export const command = {
  name: ["plugin", "plugins"],
  description: "Install, uninstall, and list command plugins",
};

const DEFAULT_DIR = join(homedir(), ".oracle", "commands");
const MANIFEST = ".plugins.json";

interface PluginEntry {
  name: string;
  repo: string;
  file: string;
  installedAt: string;
  version?: string;
}

function manifestPath(dir: string) { return join(dir, MANIFEST); }

function loadManifest(dir: string): PluginEntry[] {
  try { return JSON.parse(readFileSync(manifestPath(dir), "utf-8")); }
  catch { return []; }
}

function saveManifest(dir: string, entries: PluginEntry[]) {
  writeFileSync(manifestPath(dir), JSON.stringify(entries, null, 2) + "\n");
}

function parseArgs(args: string[]): { sub: string; source?: string; dir: string; specific?: string } {
  const sub = args[0]?.toLowerCase() || "";
  let dir = DEFAULT_DIR;
  let source: string | undefined;
  let specific: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) { dir = args[++i]; continue; }
    if (!source) source = args[i];
  }

  // Check for specific file: org/repo/file.ts
  if (source) {
    const parts = source.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").split("/");
    if (parts.length > 2 && parts[parts.length - 1].endsWith(".ts")) {
      specific = parts.pop()!;
      source = parts.join("/");
    }
  }

  return { sub, source, dir, specific };
}

export default async function (args: string[]) {
  const { sub, source, dir, specific } = parseArgs(args);

  if (sub === "install" || sub === "add") await install(source, dir, specific);
  else if (sub === "uninstall" || sub === "rm" || sub === "remove") await uninstall(source, dir);
  else if (sub === "list" || sub === "ls" || !sub) await list(dir);
  else {
    console.log(`\x1b[36mmaw plugin\x1b[0m — manage command plugins\n`);
    console.log(`  maw plugin install <org/repo>              Install all plugins from repo`);
    console.log(`  maw plugin install <org/repo/file.ts>      Install one plugin`);
    console.log(`  maw plugin install <org/repo> --dir <path> Custom install directory`);
    console.log(`  maw plugin uninstall <name>                Remove a plugin`);
    console.log(`  maw plugin list                            List installed plugins`);
    console.log(`\n\x1b[90mDefault dir: ~/.oracle/commands/\x1b[0m`);
  }
}

async function install(source: string | undefined, dir: string, specific?: string) {
  if (!source) { console.error("usage: maw plugin install <org/repo> [--dir <path>]"); return; }

  const slug = source.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  if (!slug.includes("/")) { console.error(`\x1b[31m✗\x1b[0m need org/repo format`); return; }

  console.log(`\n  \x1b[36m⏳\x1b[0m fetching ${slug}...`);

  // Clone/update via ghq
  try { execSync(`ghq get -u github.com/${slug}`, { stdio: "pipe" }); }
  catch {
    const fallback = join(homedir(), ".oracle", "command-repos", slug.split("/").pop()!);
    mkdirSync(join(homedir(), ".oracle", "command-repos"), { recursive: true });
    if (!existsSync(fallback)) execSync(`git clone https://github.com/${slug}.git ${fallback}`, { stdio: "pipe" });
    else execSync(`git -C ${fallback} pull --ff-only`, { stdio: "pipe" });
  }

  // Find cloned path
  let repoPath: string;
  try { repoPath = execSync(`ghq list --full-path | grep -i '/${slug}$' | head -1`, { encoding: "utf-8" }).trim(); }
  catch { repoPath = join(homedir(), ".oracle", "command-repos", slug.split("/").pop()!); }

  if (!existsSync(repoPath)) { console.error(`\x1b[31m✗\x1b[0m clone failed`); return; }

  // Get version from git
  let version = "";
  try { version = execSync(`git -C ${repoPath} describe --tags --always 2>/dev/null || git -C ${repoPath} rev-parse --short HEAD`, { encoding: "utf-8" }).trim(); }
  catch { /* ok */ }

  // Find plugin files
  mkdirSync(dir, { recursive: true });
  const manifest = loadManifest(dir);

  const tsFiles = readdirSync(repoPath).filter((f) => f.endsWith(".ts") && f !== "plugin.ts");
  const plugins: string[] = [];

  for (const f of specific ? [specific] : tsFiles) {
    const srcPath = join(repoPath, f);
    if (!existsSync(srcPath)) { console.log(`  \x1b[31m✗\x1b[0m not found: ${f}`); continue; }

    const content = readFileSync(srcPath, "utf-8");
    if (!content.includes("export const command")) continue;

    // Copy (not symlink!) to target dir
    const destPath = join(dir, f);
    copyFileSync(srcPath, destPath);

    // Verify it loads
    let cmdName = f.replace(/\.ts$/, "");
    try {
      const mod = await import(destPath);
      cmdName = Array.isArray(mod.command?.name) ? mod.command.name[0] : (mod.command?.name || cmdName);
    } catch { /* ok, still installed */ }

    plugins.push(cmdName);
    console.log(`  \x1b[32m✓\x1b[0m ${cmdName}`);

    // Update manifest
    const idx = manifest.findIndex((e) => e.file === f);
    const entry: PluginEntry = { name: cmdName, repo: slug, file: f, installedAt: new Date().toISOString(), version };
    if (idx >= 0) manifest[idx] = entry; else manifest.push(entry);
  }

  // Always copy plugin.ts itself (the manager)
  if (!specific) {
    const pluginSrc = join(repoPath, "plugin.ts");
    if (existsSync(pluginSrc)) {
      copyFileSync(pluginSrc, join(dir, "plugin.ts"));
      console.log(`  \x1b[32m✓\x1b[0m plugin (manager)`);
    }
  }

  saveManifest(dir, manifest);
  console.log(`\n  \x1b[32m✓ ${plugins.length} plugins installed\x1b[0m → ${dir}`);
  if (version) console.log(`  \x1b[90mversion: ${version}\x1b[0m`);
  console.log();
}

async function uninstall(name: string | undefined, dir: string) {
  if (!name) { console.error("usage: maw plugin uninstall <name>"); return; }

  const manifest = loadManifest(dir);
  const entry = manifest.find((e) => e.name === name || e.file === `${name}.ts`);

  if (entry) {
    const filePath = join(dir, entry.file);
    if (existsSync(filePath)) unlinkSync(filePath);
    saveManifest(dir, manifest.filter((e) => e !== entry));
    console.log(`  \x1b[32m✓\x1b[0m uninstalled: ${entry.name} (${entry.file})`);
    console.log(`  \x1b[90m  repo clone kept. Remove: ghq rm ${entry.repo}\x1b[0m`);
  } else {
    // Try direct file removal
    const filePath = join(dir, `${name}.ts`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log(`  \x1b[32m✓\x1b[0m removed: ${name}.ts`);
    } else {
      console.error(`  \x1b[31m✗\x1b[0m not found: ${name}`);
    }
  }
}

async function list(dir: string) {
  if (!existsSync(dir)) {
    console.log(`\n  \x1b[90mNo plugins. Install: maw plugin install <org/repo>\x1b[0m\n`);
    return;
  }

  const files = readdirSync(dir).filter((f) => /\.(ts|js)$/.test(f));
  const manifest = loadManifest(dir);

  console.log(`\n  \x1b[36mCommand Plugins\x1b[0m  (${files.length} in ${dir})\n`);

  for (const f of files) {
    const fullPath = join(dir, f);
    const entry = manifest.find((e) => e.file === f);
    const source = entry ? `\x1b[90m← ${entry.repo}${entry.version ? ` @ ${entry.version}` : ""}\x1b[0m` : "\x1b[90m(local)\x1b[0m";

    try {
      const mod = await import(fullPath);
      const name = mod.command?.name;
      const desc = mod.command?.description || "";
      const displayName = Array.isArray(name) ? name[0] : (name || f);
      console.log(`  \x1b[32m●\x1b[0m maw ${String(displayName).padEnd(18)} ${desc.slice(0, 40)} ${source}`);
    } catch {
      console.log(`  \x1b[31m●\x1b[0m ${f.padEnd(22)} \x1b[31m(load error)\x1b[0m ${source}`);
    }
  }
  console.log();
}
