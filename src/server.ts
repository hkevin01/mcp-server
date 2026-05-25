import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { loadServerConfig, type ServerConfig } from "./config/serverConfig.js";
import { missionContextProvider } from "./context/missionContext.js";
import { systemContextProvider } from "./context/systemContext.js";
import { userContextProvider } from "./context/userContext.js";
import { createBuiltinPlugins, type McpServerPlugin } from "./plugins/index.js";
import { DbClient } from "./services/dbClient.js";
import { JiraClient } from "./services/jiraClient.js";
import { createLogger, type LoggingService } from "./services/loggingService.js";
import { NasaAssuranceClient } from "./services/nasaAssuranceClient.js";
import { createToolDefinitions, ToolRegistry } from "./tools/index.js";
import type { ResolvedContext } from "./types/ContextTypes.js";
import type { AuthContext, ExecutionContext, ToolServices } from "./types/ToolTypes.js";
import { authenticateRequest } from "./utils/auth.js";
import { AppError, AuthError, formatToolError } from "./utils/errorHandler.js";

interface RuntimeOptions {
  config?: ServerConfig;
  plugins?: McpServerPlugin[];
}

interface Runtime {
  config: ServerConfig;
  services: ToolServices;
  registry: ToolRegistry;
  start: () => Promise<void>;
}

function createServices(config: ServerConfig): ToolServices {
  const logger = createLogger(config.serverName, config.logging.level);

  return {
    logger,
    jiraClient: new JiraClient({
      baseUrl: config.integrations.jiraBaseUrl,
      token: config.integrations.jiraToken,
    }),
    nasaAssuranceClient: new NasaAssuranceClient({
      baseUrl: config.integrations.nasaAssuranceBaseUrl,
      token: config.integrations.nasaAssuranceToken,
    }),
    dbClient: new DbClient(),
  };
}

async function resolveContexts(input: {
  config: ServerConfig;
  auth: AuthContext;
  transport: ExecutionContext["transport"];
}): Promise<ResolvedContext> {
  const [system, user, mission] = await Promise.all([
    systemContextProvider({ config: input.config, execution: { transport: input.transport } }),
    userContextProvider({ auth: input.auth }),
    missionContextProvider({ config: input.config }),
  ]);

  return {
    system: system.system,
    user: user.user,
    mission: mission.mission,
  };
}

async function createExecutionContext(input: {
  config: ServerConfig;
  logger: LoggingService;
  headers: IncomingHttpHeaders;
  transport: ExecutionContext["transport"];
  sessionId?: string;
  requiredScopes?: string[];
  rawMcpContext?: unknown;
}): Promise<ExecutionContext> {
  const auth = authenticateRequest({
    config: input.config,
    headers: input.headers,
    transport: input.transport,
    requiredScopes: input.requiredScopes,
  });

  return {
    requestId: randomUUID(),
    sessionId: input.sessionId,
    transport: input.transport,
    auth,
    headers: input.headers,
    contexts: await resolveContexts({
      config: input.config,
      auth,
      transport: input.transport,
    }),
    logger: input.logger,
    executionTimeoutMs: input.config.executionTimeoutMs,
    rawMcpContext: input.rawMcpContext,
  };
}

function createMcpInstance(input: {
  config: ServerConfig;
  registry: ToolRegistry;
  logger: LoggingService;
  sessionId?: string;
}): McpServer {
  const server = new McpServer(
    {
      name: input.config.serverName,
      version: input.config.serverVersion,
    },
    {
      capabilities: { logging: {} },
      instructions:
        "Use tools for external actions, rely on structured content where available, and respect auth- and mission-derived constraints in tool responses.",
    },
  );

  for (const tool of input.registry.list()) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputShape,
        annotations: tool.annotations,
      },
      async (args: unknown, mcpContext: unknown) => {
        const executionContext = await createExecutionContext({
          config: input.config,
          logger: input.logger.child(tool.name),
          headers: {},
          transport: input.config.transport,
          sessionId: input.sessionId,
          requiredScopes: tool.requiredScopes,
          rawMcpContext: mcpContext,
        });

        try {
          const outcome = await input.registry.execute(tool.name, args, executionContext);
          return {
            content: [{ type: "text", text: outcome.summary }],
            structuredContent: outcome.result,
          };
        } catch (error) {
          return formatToolError(error);
        }
      },
    );
  }

  return server;
}

function createHttpAuthMiddleware(config: ServerConfig, logger: LoggingService) {
  return (request: Request, response: Response, next: NextFunction): void => {
    try {
      authenticateRequest({
        config,
        headers: request.headers,
        transport: "http",
      });
      next();
    } catch (error) {
      const appError = error instanceof AppError ? error : new AuthError();
      logger.warn("Rejected HTTP MCP request", {
        path: request.path,
        reason: appError.message,
      });
      response.status(appError.statusCode).json({ error: appError.code, message: appError.message });
    }
  };
}

async function startHttpRuntime(input: {
  config: ServerConfig;
  logger: LoggingService;
  registry: ToolRegistry;
}): Promise<void> {
  const app = express();
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: input.config.corsOrigins === "*" ? true : input.config.corsOrigins,
      exposedHeaders: ["Mcp-Session-Id"],
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({ ok: true, transport: input.config.transport });
  });

  if (input.config.auth.enabled) {
    app.use("/mcp", createHttpAuthMiddleware(input.config, input.logger.child("auth")));
  }

  app.post("/mcp", async (request, response) => {
    const sessionId = typeof request.headers["mcp-session-id"] === "string" ? request.headers["mcp-session-id"] : undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      if (sessionId || !isInitializeRequest(request.body)) {
        response.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: invalid or missing MCP session" },
          id: null,
        });
        return;
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports.set(newSessionId, transport!);
        },
      });
      transport.onclose = () => {
        if (transport?.sessionId) {
          transports.delete(transport.sessionId);
        }
      };

      const server = createMcpInstance({
        config: input.config,
        registry: input.registry,
        logger: input.logger.child("mcp-http"),
      });
      await server.connect(transport);
    }

    await transport.handleRequest(request, response, request.body);
  });

  app.get("/mcp", async (request, response) => {
    const sessionId = typeof request.headers["mcp-session-id"] === "string" ? request.headers["mcp-session-id"] : undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      response.status(400).send("Invalid or missing session ID");
      return;
    }
    await transport.handleRequest(request, response);
  });

  app.delete("/mcp", async (request, response) => {
    const sessionId = typeof request.headers["mcp-session-id"] === "string" ? request.headers["mcp-session-id"] : undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      response.status(400).send("Invalid or missing session ID");
      return;
    }
    await transport.handleRequest(request, response);
  });

  await new Promise<void>((resolve) => {
    app.listen(input.config.port, input.config.host, () => {
      input.logger.info("MCP HTTP server listening", {
        url: `http://${input.config.host}:${input.config.port}/mcp`,
      });
      resolve();
    });
  });
}

async function startStdioRuntime(input: {
  config: ServerConfig;
  logger: LoggingService;
  registry: ToolRegistry;
}): Promise<void> {
  const server = createMcpInstance({
    config: input.config,
    registry: input.registry,
    logger: input.logger.child("mcp-stdio"),
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  input.logger.info("MCP stdio server connected");
}

export function createRuntime(options: RuntimeOptions = {}): Runtime {
  const config = options.config ?? loadServerConfig();
  const services = createServices(config);
  const plugins = [...createBuiltinPlugins(), ...(options.plugins ?? [])];
  const registry = new ToolRegistry(createToolDefinitions(services), plugins);

  return {
    config,
    services,
    registry,
    start: async () => {
      if (config.transport === "stdio") {
        await startStdioRuntime({ config, logger: services.logger, registry });
        return;
      }

      await startHttpRuntime({ config, logger: services.logger, registry });
    },
  };
}