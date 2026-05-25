import { describe, expect, it } from "vitest";

import { createRuntime } from "../src/server.js";

describe("Runtime integration", () => {
  it("creates a registry with all scaffold tools", () => {
    const runtime = createRuntime();

    const toolNames = runtime.registry.list().map((tool) => tool.name);
    expect(toolNames).toEqual([
      "jira_query",
      "nasa_assurance_lookup",
      "search_knowledge",
      "custom_action",
    ]);
  });

  it("defaults to HTTP transport when no env override is present", () => {
    const runtime = createRuntime();
    expect(runtime.config.transport).toBe("http");
  });
});