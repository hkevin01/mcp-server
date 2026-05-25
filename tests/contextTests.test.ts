import { describe, expect, it } from "vitest";

import { loadServerConfig } from "../src/config/serverConfig.js";
import { missionContextProvider } from "../src/context/missionContext.js";
import { systemContextProvider } from "../src/context/systemContext.js";
import { userContextProvider } from "../src/context/userContext.js";

describe("Context providers", () => {
  it("builds system, user, and mission context slices", async () => {
    const config = loadServerConfig();

    const system = await systemContextProvider({
      config,
      execution: { transport: "http" },
    });
    const user = await userContextProvider({
      auth: {
        subject: "tester",
        roles: ["operator"],
        scopes: ["tools:read"],
        authenticated: true,
        authType: "api-key",
      },
    });
    const mission = await missionContextProvider({ config });

    expect(system.system.serverName).toBe(config.serverName);
    expect(user.user.subject).toBe("tester");
    expect(mission.mission.missionId).toBe(config.mission.missionId);
  });
});