import type { IncomingHttpHeaders } from "node:http";

import type { ServerConfig } from "../config/serverConfig.js";
import type { AuthContext } from "../types/ToolTypes.js";
import type { TransportMode } from "../types/ContextTypes.js";
import { AuthError } from "./errorHandler.js";

export function authenticateRequest(input: {
  config: ServerConfig;
  headers?: IncomingHttpHeaders;
  transport: TransportMode;
  requiredScopes?: string[];
}): AuthContext {
  if (input.transport === "stdio" && input.config.auth.allowAnonymousStdio) {
    return {
      subject: "local-process",
      roles: ["local"],
      scopes: ["*"],
      authenticated: false,
      authType: "local",
    };
  }

  if (!input.config.auth.enabled) {
    return {
      subject: "anonymous",
      roles: ["guest"],
      scopes: [],
      authenticated: false,
      authType: "anonymous",
    };
  }

  const headerName = input.config.auth.headerName.toLowerCase();
  const headerValue = input.headers?.[headerName];
  const apiKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!apiKey || !input.config.auth.apiKeys.has(apiKey)) {
    throw new AuthError("Missing or invalid API key");
  }

  const scopes = ["tools:read", "tools:write", "context:read"];
  const requiredScopes = input.requiredScopes ?? [];
  const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length > 0) {
    throw new AuthError(`Missing required scopes: ${missingScopes.join(", ")}`);
  }

  return {
    subject: `api-key:${headerName}`,
    roles: ["operator"],
    scopes,
    authenticated: true,
    authType: "api-key",
  };
}