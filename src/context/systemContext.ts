import type { ServerConfig } from "../config/serverConfig.js";
import type { ExecutionContext } from "../types/ToolTypes.js";
import type { SystemContext } from "../types/ContextTypes.js";

export async function systemContextProvider(input: {
  config: ServerConfig;
  execution: Pick<ExecutionContext, "transport">;
}): Promise<{ system: SystemContext }> {
  return {
    system: {
      serverName: input.config.serverName,
      serverVersion: input.config.serverVersion,
      transport: input.execution.transport,
      environment: input.config.environment,
      requestTimestamp: new Date().toISOString(),
    },
  };
}