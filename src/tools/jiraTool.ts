import { z } from "zod";

import type { ToolDefinition, ToolServices } from "../types/ToolTypes.js";

interface JiraToolInput {
  query: string;
  limit?: number;
  projectKey?: string;
}

export function createJiraTool(services: ToolServices): ToolDefinition<JiraToolInput> {
  return {
    name: "jira_query",
    title: "Jira Query",
    description: "Query Jira issues by free text, key, or JQL-like string.",
    inputSchemaId: "https://mcp-server.local/schemas/jiraSchema.json",
    outputSchemaId: "https://mcp-server.local/schemas/commonTypes.json#/definitions/toolEnvelope",
    requiredScopes: ["tools:read"],
    annotations: {
      title: "Jira Query",
      readOnlyHint: true,
      idempotentHint: true,
    },
    inputShape: {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional(),
      projectKey: z.string().min(1).optional(),
    },
    async execute(input) {
      const issues = await services.jiraClient.search(input.query, {
        limit: input.limit,
        projectKey: input.projectKey,
      });

      return {
        tool: "jira_query",
        source: services.jiraClient.constructor.name,
        timestamp: new Date().toISOString(),
        data: {
          issues,
          query: input.query,
        },
      };
    },
    summarize(output) {
      const issues = Array.isArray((output.data as { issues?: unknown[] }).issues)
        ? ((output.data as { issues?: unknown[] }).issues ?? [])
        : [];
      return `Returned ${issues.length} Jira issue(s).`;
    },
  };
}