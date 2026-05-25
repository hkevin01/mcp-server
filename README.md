# MCP Server Scaffolding

Production-oriented MCP server scaffold for TypeScript using the stable `@modelcontextprotocol/sdk` v1 line. The project is structured for tool registration, JSON-schema validation, context providers, secure execution, auth hooks, logging, and plugin-based extension.

## Included Capabilities

- Tool registry with Jira, NASA assurance, search, and custom domain tool examples
- JSON schema validation with Ajv for tool inputs and outputs
- Context providers for system, user, and mission state
- Streamable HTTP transport for remote clients and stdio transport for local clients
- Secure execution wrapper with auth checks, schema validation, timeout handling, and structured errors
- Logging and plugin hooks for request lifecycle extension
- Service layer stubs for Jira, assurance systems, and indexed search
- Vitest test harness for tools, context, and integration slices

## Project Structure

```text
mcp-server/
├── package.json
├── tsconfig.json
├── README.md
├── .env
├── .env.example
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── config/
│   │   └── serverConfig.ts
│   ├── tools/
│   │   ├── index.ts
│   │   ├── jiraTool.ts
│   │   ├── nasaAssuranceTool.ts
│   │   ├── searchTool.ts
│   │   └── customTool.ts
│   ├── schemas/
│   │   ├── jiraSchema.json
│   │   ├── assuranceSchema.json
│   │   ├── searchSchema.json
│   │   ├── customToolSchema.json
│   │   └── commonTypes.json
│   ├── context/
│   │   ├── systemContext.ts
│   │   ├── userContext.ts
│   │   └── missionContext.ts
│   ├── services/
│   │   ├── jiraClient.ts
│   │   ├── nasaAssuranceClient.ts
│   │   ├── dbClient.ts
│   │   └── loggingService.ts
│   ├── utils/
│   │   ├── errorHandler.ts
│   │   ├── schemaValidator.ts
│   │   └── auth.ts
│   ├── plugins/
│   │   └── index.ts
│   └── types/
│       ├── ToolTypes.ts
│       └── ContextTypes.ts
└── tests/
    ├── toolTests.test.ts
    ├── contextTests.test.ts
    └── integration.test.ts
```

## Getting Started

```bash
npm install
npm run dev:http
```

For local spawned clients instead of HTTP:

```bash
npm run dev:stdio
```

## Environment Variables

- `MCP_TRANSPORT`: `http` or `stdio`
- `MCP_HOST`, `MCP_PORT`: HTTP bind settings
- `MCP_AUTH_ENABLED`: `true` enables API key enforcement for HTTP requests
- `MCP_API_KEY_HEADER`: header name checked for API key authentication
- `MCP_API_KEYS`: comma-separated allowed keys
- `MCP_CORS_ORIGINS`: `*` or comma-separated origins for HTTP mode
- `MCP_EXECUTION_TIMEOUT_MS`: per-tool execution timeout
- `MISSION_*`: default mission context injected into tool handlers
- `JIRA_*`, `NASA_ASSURANCE_*`: optional external service credentials

## Extending The Scaffold

### Add a Tool

1. Create a schema in `src/schemas/`.
2. Add a tool module in `src/tools/`.
3. Export it from `src/tools/index.ts`.
4. Optionally wire a new service client in `src/services/`.

### Add a Context Provider

1. Create a provider in `src/context/`.
2. Add it to `createContextProviders` in `src/server.ts`.

### Add a Plugin

1. Implement `McpServerPlugin` in `src/plugins/` or inline.
2. Pass it into `createRuntime({ plugins: [...] })`.

## Auth And Security Notes

- This scaffold ships with API-key hooks and redacted logging for development and internal service patterns.
- For internet-facing deployments, replace the API-key verifier with OAuth or JWT validation using the MCP authorization flow and a standards-compliant identity provider.
- Tool execution is protected with schema validation, auth checks, timeout enforcement, and structured errors.

## Scripts

- `npm run build`
- `npm run dev:http`
- `npm run dev:stdio`
- `npm run test`

## Client Compatibility

The scaffold speaks standard MCP over stdio and Streamable HTTP, which makes it suitable for any client that supports MCP transports, including OpenAI-compatible MCP hosts, Anthropic tooling, IDE integrations, and custom orchestrators.