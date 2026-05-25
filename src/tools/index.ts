import type { ExecutionContext, ToolDefinition, ToolRegistryResult, ToolServices } from "../types/ToolTypes.js";
import { validateAgainstSchema } from "../utils/schemaValidator.js";
import { runWithTimeout } from "../utils/errorHandler.js";
import type { McpServerPlugin } from "../plugins/index.js";

import { createCustomTool } from "./customTool.js";
import { createJiraTool } from "./jiraTool.js";
import { createNasaAssuranceTool } from "./nasaAssuranceTool.js";
import { createSearchTool } from "./searchTool.js";

export function createToolDefinitions(services: ToolServices): ToolDefinition[] {
  return [
    createJiraTool(services),
    createNasaAssuranceTool(services),
    createSearchTool(services),
    createCustomTool(services),
  ];
}

export class ToolRegistry {
  private readonly toolsByName: Map<string, ToolDefinition>;

  public constructor(
    private readonly tools: ToolDefinition[],
    private readonly plugins: McpServerPlugin[] = [],
  ) {
    this.toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  }

  public list(): ToolDefinition[] {
    return [...this.tools];
  }

  public async execute(
    toolName: string,
    input: unknown,
    context: ExecutionContext,
  ): Promise<ToolRegistryResult> {
    const tool = this.toolsByName.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const validatedInput = validateAgainstSchema(tool.inputSchemaId, input);

    for (const plugin of this.plugins) {
      await plugin.onRequestStart?.(tool.name, context, validatedInput);
    }

    try {
      const result = await runWithTimeout(
        tool.execute(validatedInput, context),
        context.executionTimeoutMs,
      );

      if (tool.outputSchemaId) {
        validateAgainstSchema(tool.outputSchemaId, result);
      }

      for (const plugin of this.plugins) {
        await plugin.onRequestSuccess?.(tool.name, context, result);
      }

      return {
        result,
        summary: tool.summarize?.(result) ?? JSON.stringify(result, null, 2),
      };
    } catch (error) {
      for (const plugin of this.plugins) {
        await plugin.onRequestError?.(tool.name, context, error);
      }

      throw error;
    }
  }
}