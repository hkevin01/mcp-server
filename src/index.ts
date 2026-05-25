import { createRuntime } from "./server.js";

async function main(): Promise<void> {
  const runtime = createRuntime();
  await runtime.start();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});