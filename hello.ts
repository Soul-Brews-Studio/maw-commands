/**
 * Example command plugin (beta).
 * Drop in ~/.oracle/commands/ — auto-discovered by maw CLI.
 */
export const command = {
  name: "hello",
  description: "Say hello from a plugin command",
};

export default async function() {
  console.log("  \x1b[36m👋\x1b[0m Hello from a command plugin!");
  console.log("  \x1b[90mThis command lives in ~/.oracle/commands/hello.ts\x1b[0m");
}
