# maw-commands

Command plugins for [maw-js](https://github.com/Soul-Brews-Studio/maw-js) CLI.

## Install

```bash
# Install the plugin manager
curl -fsSL https://raw.githubusercontent.com/Soul-Brews-Studio/maw-commands/main/plugin.ts \
  -o ~/.oracle/commands/plugin.ts

# Then install plugins from any GitHub repo
maw plugin install Soul-Brews-Studio/maw-commands
```

Or drop files directly:

```bash
curl -fsSL https://raw.githubusercontent.com/Soul-Brews-Studio/maw-commands/main/hello.ts \
  -o ~/.oracle/commands/hello.ts
```

## Plugins

| Plugin | Command | Description |
|--------|---------|-------------|
| [plugin.ts](plugin.ts) | `maw plugin install/uninstall/list` | Plugin manager |
| [hello.ts](hello.ts) | `maw hello` | Example (hello world) |

## Write a Plugin

```typescript
// ~/.oracle/commands/greet.ts
export const command = { name: "greet", description: "Greet someone" };
export default async function(args: string[]) {
  console.log(`Hello, ${args[0] || "world"}!`);
}
```

Supports subcommands (`name: "fleet doctor"`), aliases (`name: ["status", "st"]`), typed flags (`flags: { "--json": Boolean }`).

## Requires

maw-js v1.15.0+ (command registry beta) + Bun
