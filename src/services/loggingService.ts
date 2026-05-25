type LogLevel = "debug" | "info" | "warn" | "error";

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
      .replace(/(token|secret|authorization|api[-_]?key)\s*[:=]\s*[^\s,]+/gi, "$1=[redacted]");
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitize(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (/(authorization|token|secret|api[-_]?key)/i.test(key)) {
          return [key, "[redacted]"];
        }

        return [key, sanitize(entry)];
      }),
    );
  }

  return value;
}

export class LoggingService {
  public constructor(
    private readonly scope: string,
    private readonly minimumLevel: LogLevel = "info",
  ) {}

  public child(scope: string): LoggingService {
    return new LoggingService(`${this.scope}:${scope}`, this.minimumLevel);
  }

  public debug(message: string, meta?: unknown): void {
    this.write("debug", message, meta);
  }

  public info(message: string, meta?: unknown): void {
    this.write("info", message, meta);
  }

  public warn(message: string, meta?: unknown): void {
    this.write("warn", message, meta);
  }

  public error(message: string, meta?: unknown): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (levelRank[level] < levelRank[this.minimumLevel]) {
      return;
    }

    const payload = meta === undefined ? "" : ` ${JSON.stringify(sanitize(meta))}`;
    console[level](`[${new Date().toISOString()}] [${level}] [${this.scope}] ${message}${payload}`);
  }
}

export function createLogger(scope: string, level: LogLevel): LoggingService {
  return new LoggingService(scope, level);
}