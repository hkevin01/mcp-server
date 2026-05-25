export type TransportMode = "http" | "stdio";

export interface SystemContext {
  serverName: string;
  serverVersion: string;
  transport: TransportMode;
  environment: string;
  requestTimestamp: string;
}

export interface UserContext {
  subject: string;
  roles: string[];
  scopes: string[];
  authenticated: boolean;
  authType: "api-key" | "local" | "anonymous";
}

export interface MissionContext {
  missionId: string;
  missionName: string;
  environment: string;
}

export interface ResolvedContext {
  system: SystemContext;
  user: UserContext;
  mission: MissionContext;
}