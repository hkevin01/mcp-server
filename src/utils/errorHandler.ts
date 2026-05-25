export class AppError extends Error {
  public constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class AuthError extends AppError {
  public constructor(message = "Unauthorized", details?: unknown) {
    super(message, "AUTH_ERROR", 401, details);
  }
}

export class ValidationError extends AppError {
  public constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class ExecutionTimeoutError extends AppError {
  public constructor(timeoutMs: number) {
    super(`Tool execution exceeded timeout of ${timeoutMs}ms`, "EXECUTION_TIMEOUT", 408, { timeoutMs });
  }
}

export function formatToolError(error: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  if (error instanceof AppError) {
    return {
      content: [{ type: "text", text: `${error.code}: ${error.message}` }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : "Unexpected tool execution error" }],
    isError: true,
  };
}

export async function runWithTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new ExecutionTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}