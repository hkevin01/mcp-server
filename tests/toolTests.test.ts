import { describe, expect, it } from "vitest";

import { createToolDefinitions, ToolRegistry } from "../src/tools/index.js";
import { DbClient } from "../src/services/dbClient.js";
import { JiraClient } from "../src/services/jiraClient.js";
import { createLogger } from "../src/services/loggingService.js";
import { NasaAssuranceClient } from "../src/services/nasaAssuranceClient.js";
import type { ExecutionContext, ToolServices } from "../src/types/ToolTypes.js";

function createServices(): ToolServices {
  return {
    logger: createLogger("test", "error"),
    jiraClient: new JiraClient({}),
    nasaAssuranceClient: new NasaAssuranceClient({}),
    dbClient: new DbClient(),
  };
}

function createExecutionContext(): ExecutionContext {
  return {
    requestId: "req-1",
    transport: "http",
    headers: {},
    auth: {
      subject: "tester",
      roles: ["operator"],
      scopes: ["tools:read", "tools:write"],
      authenticated: true,
      authType: "api-key",
    },
    contexts: {
      system: {
        serverName: "test-server",
        serverVersion: "0.1.0",
        transport: "http",
        environment: "test",
        requestTimestamp: new Date().toISOString(),
      },
      user: {
        subject: "tester",
        roles: ["operator"],
        scopes: ["tools:read", "tools:write"],
        authenticated: true,
        authType: "api-key",
      },
      mission: {
        missionId: "mission-test",
        missionName: "Test Mission",
        environment: "test",
      },
    },
    logger: createLogger("test", "error"),
    executionTimeoutMs: 1000,
  };
}

describe("Tool registry", () => {
  it("executes the Jira scaffold tool", async () => {
    const registry = new ToolRegistry(createToolDefinitions(createServices()));
    const result = await registry.execute(
      "jira_query",
      { query: "MCP", limit: 2 },
      createExecutionContext(),
    );

    expect(result.summary).toContain("Jira issue");
    expect(result.result.tool).toBe("jira_query");
  });

  it("rejects invalid payloads via JSON schema validation", async () => {
    const registry = new ToolRegistry(createToolDefinitions(createServices()));

    await expect(
      registry.execute("search_knowledge", { maxResults: 2 }, createExecutionContext()),
    ).rejects.toThrow(/validation/i);
  });
});