import type { AuthContext } from "../types/ToolTypes.js";
import type { UserContext } from "../types/ContextTypes.js";

export async function userContextProvider(input: {
  auth: AuthContext;
}): Promise<{ user: UserContext }> {
  return {
    user: {
      subject: input.auth.subject,
      roles: input.auth.roles,
      scopes: input.auth.scopes,
      authenticated: input.auth.authenticated,
      authType: input.auth.authType,
    },
  };
}