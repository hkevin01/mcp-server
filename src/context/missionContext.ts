import type { ServerConfig } from "../config/serverConfig.js";
import type { MissionContext } from "../types/ContextTypes.js";

export async function missionContextProvider(input: {
  config: ServerConfig;
}): Promise<{ mission: MissionContext }> {
  return {
    mission: {
      missionId: input.config.mission.missionId,
      missionName: input.config.mission.missionName,
      environment: input.config.mission.environment,
    },
  };
}